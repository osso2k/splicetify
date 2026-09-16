from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from config.database import get_db
from controllers.auth import signup
from ..config.schemas import SignupRequest

from fastapi import APIRouter
from services.spotify import handle_code
from controllers.spotify import connect_spotify
from controllers.auth import signup


router = APIRouter()
@router.get("/auth/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    signup(data, db)


@router.get("/spotify/connect")
def spotify_connect():
    return connect_spotify()

@router.get("/spotify/connected")
async def spotify_connected(code:str):
    return handle_code(code)

@router.get("/spotify/connected/getplaylists")
def get_playlists():
    pass

@router.get("/spotify/getrandomsong")
def get_random_song():
    pass