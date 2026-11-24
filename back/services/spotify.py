import base64
import os
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode
from uuid import uuid4

import requests
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from config.database import get_db
from middleware.auth_middleware import validate_user
from models.models import SpotifyConnection

AUTHORIZE_URL = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"
API_BASE = "https://api.spotify.com/v1"
REQUEST_TIMEOUT_SECONDS = 10

load_dotenv()

SCOPES = [
    "user-read-private",
    "user-read-email",
    "playlist-read-private",
    "playlist-read-collaborative",
]


def _client_credentials_header() -> str:
    client_id = os.getenv("CLIENT_ID")
    client_secret = os.getenv("CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Spotify credentials are not configured on the server.")
    raw = f"{client_id}:{client_secret}"
    return "Basic " + base64.b64encode(raw.encode()).decode()


def get_spotify_auth_url(state: str | None = None):
    redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI")
    if not redirect_uri:
        raise HTTPException(status_code=500, detail="Spotify redirect URI is not configured on the server.")
    state = state or uuid4().hex
    params = {
        "client_id": os.getenv("CLIENT_ID"),
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "scope": " ".join(SCOPES),
        "state": state,
    }
    return f"{AUTHORIZE_URL}?{urlencode(params)}", state


def _post_token_form(data: dict[str, str], *, refreshing: bool = False) -> dict:
    try:
        response = requests.post(
            TOKEN_URL,
            data=data,
            headers={
                "Authorization": _client_credentials_header(),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="Could not reach Spotify. Please try again.") from exc

    if not response.ok:
        print(f"Spotify token request failed: HTTP {response.status_code}")
        if refreshing and response.status_code in (400, 401):
            raise HTTPException(
                status_code=409,
                detail="Your Spotify connection expired or was revoked. Reconnect Spotify to continue.",
            )
        raise HTTPException(status_code=502, detail="Spotify could not complete the connection. Please try again.")
    return response.json()


def handle_code(code: str) -> dict:
    redirect_uri = os.getenv("SPOTIFY_REDIRECT_URI")
    if not redirect_uri:
        raise HTTPException(status_code=500, detail="Spotify redirect URI is not configured on the server.")
    return _post_token_form({
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
    })


def refresh_spotify_connection(connection: SpotifyConnection, db: Session):
    token_data = _post_token_form({
        "grant_type": "refresh_token",
        "refresh_token": connection.refresh_token,
    }, refreshing=True)

    # Spotify uses 400 for an invalid/revoked refresh token. Convert that case
    # to an actionable response rather than leaving the user with a server error.
    connection.access_token = token_data["access_token"]
    connection.refresh_token = token_data.get("refresh_token") or connection.refresh_token
    connection.expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_data["expires_in"])
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        print("Spotify token refresh save failed:", repr(exc))
        raise HTTPException(status_code=500, detail="Could not update your Spotify connection.") from exc
    return connection.access_token


def spotify_get(endpoint: str, access_token: str, params: dict[str, int] | None = None):
    try:
        response = requests.get(
            f"{API_BASE}{endpoint}",
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="Could not reach Spotify. Please try again.") from exc

    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="Spotify access token expired.")
    if not response.ok:
        print(f"Spotify API request failed: HTTP {response.status_code} for {endpoint}")
        raise HTTPException(status_code=502, detail="Spotify could not load this data. Please try again.")
    return response.json()


def get_user_playlist(
    user_id=Depends(validate_user),
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
):
    connection = db.query(SpotifyConnection).filter(SpotifyConnection.user_id == user_id).first()
    if connection is None:
        raise HTTPException(status_code=404, detail="Spotify account is not connected.")

    expires_at = connection.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    access_token = connection.access_token
    if expires_at <= datetime.now(timezone.utc) + timedelta(seconds=60):
        access_token = refresh_spotify_connection(connection, db)

    try:
        return spotify_get("/me/playlists", access_token=access_token, params={"limit": limit, "offset": offset})
    except HTTPException as exc:
        if exc.status_code != 401:
            raise
        access_token = refresh_spotify_connection(connection, db)
        try:
            return spotify_get("/me/playlists", access_token=access_token, params={"limit": limit, "offset": offset})
        except HTTPException as retry_error:
            if retry_error.status_code != 401:
                raise
            raise HTTPException(
                status_code=409,
                detail="Spotify rejected the refreshed token. Reconnect Spotify to continue.",
            ) from retry_error
