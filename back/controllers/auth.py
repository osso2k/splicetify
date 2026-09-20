from sqlalchemy.orm import Session
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

    # make the token

    return {"message": "Successfully Signed UP", "user_id": player.id}

def login(data: LoginRequest, db: Session):
    existing_user = (db.query(Player).filter(Player.email == data.email).first())
    if not existing_user:
        return {"message": "User Not Found"}
    
    if data.password == verify_password(existing_user.password_hash):
        # make the token
        return {"message" : "Logged in", "user_id": existing_user.id}
    else:
        return {"message": "Wrong Credentials"}