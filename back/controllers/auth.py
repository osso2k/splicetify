from sqlalchemy.orm import Session
from middleware.auth_middleware import create_token
from models.models import Player
from services.auth import hash_password, verify_password
from config.schemas import SignupRequest, LoginRequest

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
    
    if verify_password(data.password, existing_user.password_hash):
        token = create_token(existing_user.id)
        return {"message" : "Logged in", "user_id": existing_user.id, "token": token}
    else:
        return {"message": "Wrong Credentials"}