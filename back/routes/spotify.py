import os
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from services.spotify import get_user_playlist
from config.database import get_db
from config.schemas import GoogleSignIn, LoginRequest, PinnedPlaylistsRequest, SignupRequest
from controllers.spotify import (
    connect_spotify,
    get_pinned_playlists,
    save_pinned_playlists,
    store_access_token,
)
from controllers.auth import google_signin_controller, login_controller, signup_controller
from middleware.auth_middleware import validate_user
from models.models import SpotifyOAuthState

auth_router = APIRouter(prefix="/auth")
app_router = APIRouter(
    dependencies = [Depends(validate_user)]
)

public_router = APIRouter()

@public_router.get("/spotify/connected")
def spotify_connected(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    frontend_url = (os.getenv("FRONTEND_URL") or "http://localhost:5173").rstrip("/")
    if error:
        message = "Spotify access was cancelled. You can try again any time."
        if state:
            oauth_state = db.query(SpotifyOAuthState).filter_by(state=state).first()
            if oauth_state is not None:
                db.delete(oauth_state)
                db.commit()
        return RedirectResponse(f"{frontend_url}/?{urlencode({'spotify_error': message})}")
    if not code or not state:
        message = "Spotify did not return a valid connection response. Please try again."
        return RedirectResponse(f"{frontend_url}/?{urlencode({'spotify_error': message})}")

    try:
        store_access_token(code, state, db)
    except HTTPException as exc:
        message = exc.detail if exc.status_code in (400, 409) else "Spotify could not be connected. Please try again."
        return RedirectResponse(f"{frontend_url}/?{urlencode({'spotify_error': message})}")
    return RedirectResponse(f"{frontend_url}/?spotify=connected")

@auth_router.post("/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    return signup_controller(data, db)


@auth_router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    return login_controller(data, db)

@auth_router.post("/googlesignin")
def google_signin(data: GoogleSignIn, db: Session = Depends(get_db)):
    return google_signin_controller(data, db)

@app_router.get("/")
def test():
    return {"message": "you can see"}

@app_router.get("/spotify/connect")
def spotify_connect(userId = Depends(validate_user), db:Session = Depends(get_db)):
    return connect_spotify(userId, db)

# @app_router.get("/spotify/connected")
# async def spotify_connected(code:str, state, db: Session = Depends(get_db)):
#     store_access_token(code, state, db)
#     return RedirectResponse(url="http://localhost:5173")

@app_router.get("/spotify/getplaylists")
def get_playlists(
    userId=Depends(validate_user),
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
):
    return get_user_playlist(userId, db, limit=limit, offset=offset)


@app_router.get("/spotify/pinned-playlists")
def pinned_playlists(userId=Depends(validate_user), db: Session = Depends(get_db)):
    return get_pinned_playlists(userId, db)


@app_router.put("/spotify/pinned-playlists")
def update_pinned_playlists(
    data: PinnedPlaylistsRequest,
    userId=Depends(validate_user),
    db: Session = Depends(get_db),
):
    return save_pinned_playlists(userId, data.items, db)

@app_router.get("/spotify/getrandomsong")
def get_random_song():
    pass
