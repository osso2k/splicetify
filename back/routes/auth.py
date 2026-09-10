from fastapi import APIRouter
from controllers.auth_controllers import connect_spotify

router = APIRouter()
@router.get("/spotify/connect")
def spotify_connect():
    connect_spotify()