from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from config.database import get_db
from config.schemas import SignupRequest, LoginRequest

from fastapi import APIRouter
from services.spotify import handle_code
from controllers.spotify import connect_spotify, store_access_token
from controllers.auth import signup_controller


router = APIRouter()


@router.post("/auth/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    return signup_controller(data, db)


@router.post("/auth/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    return login(data, db)


@router.get("/spotify/connect")
def spotify_connect():
    return connect_spotify()

@router.get("/spotify/connected")
async def spotify_connected(code:str):
    return store_access_token(code)

@router.get("/spotify/connected/getplaylists")
def get_playlists():
    pass

@router.get("/spotify/getrandomsong")
def get_random_song():
    pass