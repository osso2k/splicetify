from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from models.models import PinnedSpotifyPlaylist, SpotifyConnection, SpotifyOAuthState
from services.spotify import get_spotify_auth_url, handle_code, spotify_get


def connect_spotify(user_id: str, db: Session):
    url, state = get_spotify_auth_url()
    oauth_state = SpotifyOAuthState(
        state=state,
        user_id=user_id,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
    )
    db.add(oauth_state)
    db.commit()
    return {"url": url}


def store_access_token(code: str, state: str, db: Session):
    oauth_state = db.query(SpotifyOAuthState).filter(SpotifyOAuthState.state == state).first()
    if oauth_state is None:
        raise HTTPException(status_code=400, detail="This Spotify connection link is invalid or already used.")

    state_expires_at = oauth_state.expires_at
    if state_expires_at.tzinfo is None:
        state_expires_at = state_expires_at.replace(tzinfo=timezone.utc)
    if state_expires_at <= datetime.now(timezone.utc):
        db.delete(oauth_state)
        db.commit()
        raise HTTPException(status_code=400, detail="This Spotify connection link expired. Please try again.")

    token_data = handle_code(code)
    access_token = token_data["access_token"]
    spotify_user = spotify_get("/me", access_token)
    spotify_user_id = spotify_user["id"]
    user_id = oauth_state.user_id

    # A Spotify account may only be linked to one Splicetify account. Do not
    # silently move a link between users.
    linked_account = (
        db.query(SpotifyConnection)
        .filter(SpotifyConnection.spotify_user_id == spotify_user_id)
        .first()
    )
    if linked_account is not None and linked_account.user_id != user_id:
        db.delete(oauth_state)
        db.commit()
        raise HTTPException(
            status_code=409,
            detail="This Spotify account is already linked to another Splicetify account.",
        )

    connection = (
        db.query(SpotifyConnection)
        .filter(SpotifyConnection.user_id == user_id)
        .first()
    )
    refresh_token = token_data.get("refresh_token") or (
        connection.refresh_token if connection is not None else None
    )
    if refresh_token is None:
        db.delete(oauth_state)
        db.commit()
        raise HTTPException(status_code=502, detail="Spotify did not return a refresh token. Please reconnect.")

    if connection is None:
        connection = SpotifyConnection(user_id=user_id)
        db.add(connection)

    connection.spotify_user_id = spotify_user_id
    connection.access_token = access_token
    connection.refresh_token = refresh_token
    connection.expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_data["expires_in"])
    db.delete(oauth_state)

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        print("Spotify connection save failed:", repr(exc))
        raise HTTPException(status_code=500, detail="Could not save your Spotify connection. Please try again.") from exc

    return {"message": "Spotify connected"}


def get_pinned_playlists(user_id: str, db: Session):
    pinned = (
        db.query(PinnedSpotifyPlaylist)
        .filter(PinnedSpotifyPlaylist.user_id == user_id)
        .order_by(PinnedSpotifyPlaylist.position)
        .all()
    )
    return {"items": [_pinned_playlist_payload(item) for item in pinned]}


def save_pinned_playlists(user_id: str, items, db: Session):
    if len(items) > 4:
        raise HTTPException(status_code=422, detail="You can pin up to four playlists.")
    playlist_ids = [item.id for item in items]
    if len(set(playlist_ids)) != len(playlist_ids):
        raise HTTPException(status_code=422, detail="A playlist can only be pinned once.")

    try:
        db.query(PinnedSpotifyPlaylist).filter(
            PinnedSpotifyPlaylist.user_id == user_id
        ).delete(synchronize_session=False)
        for position, item in enumerate(items):
            db.add(PinnedSpotifyPlaylist(
                user_id=user_id,
                playlist_id=item.id,
                name=item.name,
                image_url=item.image_url,
                track_count=item.track_count,
                owner_name=item.owner_name,
                position=position,
            ))
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        print("Pinned playlist save failed:", repr(exc))
        raise HTTPException(status_code=500, detail="Could not save your quick picks.") from exc

    return get_pinned_playlists(user_id, db)


def _pinned_playlist_payload(item: PinnedSpotifyPlaylist):
    return {
        "id": item.playlist_id,
        "name": item.name,
        "images": [{"url": item.image_url}] if item.image_url else [],
        "tracks": {"total": item.track_count},
        "owner": {"display_name": item.owner_name} if item.owner_name else None,
    }
