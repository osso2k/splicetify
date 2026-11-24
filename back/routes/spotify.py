from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from services.spotify import get_user_playlist
from config.database import get_db
from config.schemas import GoogleSignIn, SignupRequest, LoginRequest
from fastapi import APIRouter
from controllers.spotify import connect_spotify, store_access_token
from controllers.auth import google_signin_controller, login_controller, signup_controller
from middleware.auth_middleware import validate_user

auth_router = APIRouter(prefix="/auth")
app_router = APIRouter(
    dependencies = [Depends(validate_user)]
)

public_router = APIRouter()

@public_router.get("/spotify/connected")
def spotify_connected(code: str, state: str, db: Session = Depends(get_db)):
    store_access_token(code, state, db)
    return RedirectResponse(url="http://localhost:5173")

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
def get_playlists(userId = Depends(validate_user), db: Session = Depends(get_db)):
    return get_user_playlist(userId, db)

@app_router.get("/spotify/getrandomsong")
def get_random_song():
    pass