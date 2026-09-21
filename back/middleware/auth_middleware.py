import jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException
from datetime import datetime, timedelta, timezone
import os
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"

if not JWT_SECRET:
    raise RuntimeError("JWT SECRET NOT LOADED")

def create_token(userId):
    payload = {
        "sub": userId,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

security = HTTPBearer()


def validate_user(credential:HTTPAuthorizationCredentials = Depends(security)):
    token = credential.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=ALGORITHM)
        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(401, "Invalid Token")
        return user_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token Expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid Token")
