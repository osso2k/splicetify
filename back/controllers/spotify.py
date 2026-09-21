import datetime
from fastapi import Depends
from sqlalchemy.orm import Session
from config.database import get_db
from middleware.auth_middleware import validate_user
from services.spotify import get_spotify_auth_url, handle_code, spotify_get
from models.models import SpotifyConnection

def connect_spotify():
    url, _ = get_spotify_auth_url()
    return {"url": url}

def store_access_token(code, userId = Depends(validate_user), db: Session = Depends(get_db)):
    try:
        token_data = handle_code(code)

        access_token = token_data["access_token"]
        refresh_token = token_data["refresh_token"]

        spotify_user = spotify_get("/me", access_token)
        expires_at = datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=token_data["expires_in"])

        connection = SpotifyConnection(user_id = userId, spotify_user_id = spotify_user["id"], access_token = access_token, refresh_token = refresh_token , expires_at = expires_at )

        db.add(connection)
        db.commit()

        return {"message": "Spotify connected"}
    except:
        raise RuntimeError("Error in storing tokens")