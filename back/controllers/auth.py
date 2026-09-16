from sqlalchemy.orm import Session
from models.models import Player
from services.auth import hash_password, verify_password
from ..config.schemas import SignupRequest, LoginRequest

def signup(data: SignupRequest, db: Session):
    existing_user = (db.query(Player).filter(Player.email == data.email).first() )
    if existing_user:
        return {"error": "User Already Exists"}

    player = Player(email=data.email, name= data.name, hashedPassword= hash_password(data.password))

    db.add(Player)
    db.commit()
    db.refresh(player)

    return {"message": "Successfully Signed UP", "user_id": player.id}