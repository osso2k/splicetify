from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from sqlalchemy.orm import Session
from services.spotify import get_spotify_auth_url, handle_code, spotify_get
from models.models import SpotifyConnection, SpotifyOAuthState

def connect_spotify(userId, db):
    url, state = get_spotify_auth_url()
    oauth_state = SpotifyOAuthState(state = state, user_id = userId, expires_at = datetime.now(timezone.utc) + timedelta(minutes=10))

    db.add(oauth_state)
    db.commit()


    return {"url": url}

def store_access_token(code, state, db: Session):
    try:
        oauthstate = (db.query(SpotifyOAuthState).filter(SpotifyOAuthState.state == state).first())
        if oauthstate is None:
            raise HTTPException(400, "Invalid Oauth state")

        userId = oauthstate.user_id
        token_data = handle_code(code)

        access_token = token_data["access_token"]
        refresh_token = token_data["refresh_token"]

        spotify_user = spotify_get("/me", access_token)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_data["expires_in"])

        connection = SpotifyConnection(user_id = userId, spotify_user_id = spotify_user["id"], access_token = access_token, refresh_token = refresh_token , expires_at = expires_at )

        db.add(connection)
        db.delete(oauthstate)

        db.commit()


        return {"message": "Spotify connected"}
    except Exception as e:
        print("Error: ", repr(e))
        raise HTTPException(500,"Error in storing tokens")