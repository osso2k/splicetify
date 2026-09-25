import email
import os
from fastapi import HTTPException
from sqlalchemy.orm import Session
from middleware.auth_middleware import create_token
from models.models import Player
from services.auth import hash_password, verify_password
from config.schemas import GoogleSignIn, SignupRequest, LoginRequest
from appwrite.client import Client
from appwrite.services.account import Account
from dotenv import load_dotenv


load_dotenv()


def signup_controller(data: SignupRequest, db: Session):
    existing_user = (db.query(Player).filter(Player.email == data.email).first() )
    if existing_user:
        return {"error": "User Already Exists"}

    player = Player(email=data.email, username= data.username, password_hash= hash_password(data.password))

    db.add(player)
    db.commit()
    db.refresh(player)

    token = create_token(player.id)

    return {"message": "Successfully Signed UP", "user_id": player.id, "token": token}

def login_controller(data: LoginRequest, db: Session):
    existing_user = (db.query(Player).filter(Player.email == data.email).first())
    if not existing_user:
        return {"message": "User Not Found"}
    
    if existing_user.password_hash is None:
        return {"message": "This account uses Google sign-in"}
    
    if verify_password(data.password, existing_user.password_hash):
        token = create_token(existing_user.id)
        return {"message" : "Logged in", "user_id": existing_user.id, "token": token}
    else:
        return {"message": "Wrong Credentials"}

    
def google_signin_controller(data: GoogleSignIn, db:Session):
    client = Client()
    client.set_endpoint(os.getenv("APPWRITE_ENDPOINT"))
    client.set_project(os.getenv("APPWRITE_PROJECT_ID"))
    client.set_jwt(data.appwrite_token)

    account = Account(client)

    try:
        user = account.get()

        player = (db.query(Player).filter(Player.appwrite_id == user.id).first())

        if player is None:
            player = Player(email= user.email, username = user.name, password_hash = None, appwrite_id = user.id)

            db.add(player)
            db.commit()
            db.refresh(player)
        
        token = create_token(player.id)
        return {"access_token": token, "token_type": "Bearer"}
    except Exception as e:
        print("GOOGLE SIGNIN ERROR:", repr(e))
        raise HTTPException(
            status_code=401,
            detail="Invalid Google Signin authentication"
        )