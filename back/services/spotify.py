from calendar import c
import os
import base64
import requests
from uuid import uuid4
from dotenv import load_dotenv
from urllib.parse import urlencode
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from models.models import SpotifyConnection
from config.database import get_db
from middleware.auth_middleware import validate_user

AUTHORIZE_URL = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"
API_BASE = "https://api.spotify.com/v1" 

load_dotenv()
scopes = [
    "user-read-private",
    "user-read-email",
    "playlist-read-private",
    "playlist-read-collaborative"
]
def _client_credentials_header() -> str:
    raw = f"{os.getenv('CLIENT_ID')}:{os.getenv('CLIENT_SECRET')}"
    return "Basic " + base64.b64encode(raw.encode()).decode()


def get_spotify_auth_url(state: str | None = None):
    state = state or uuid4().hex
    params = {
        "client_id": os.getenv("CLIENT_ID"),
        "response_type": "code",
        "redirect_uri": os.getenv("SPOTIFY_REDIRECT_URI"),
        "scope": " ".join(scopes),
        "state": state
    }
    return AUTHORIZE_URL+ "?" + urlencode(params) , state


def handle_code(code: str) -> dict:
    response = requests.post(
        TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": os.getenv("SPOTIFY_REDIRECT_URI"),
        },
        headers={
            "Authorization": _client_credentials_header(),
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    if not response.ok:
        raise HTTPException(
            status_code=502,
            detail=f"Spotify token exchange failed ({response.status_code}): {response.text}",
        )
    response.raise_for_status()
    return response.json()

def spotify_get(endpoint, access_token):
    response = requests.get(f"{API_BASE}{endpoint}", headers={
        "Authorization": f"Bearer {access_token}"
    })
    response.raise_for_status()
    return response.json()

def get_user_playlist(userId = Depends(validate_user), db: Session = Depends(get_db)):
    connection = (db.query(SpotifyConnection).filter(SpotifyConnection.user_id == userId).first())

    if connection is None:
        raise HTTPException(404, "Spotify User Connection missing")


    return spotify_get("/me/playlists", access_token= connection.access_token)