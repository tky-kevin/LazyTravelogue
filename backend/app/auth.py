import os
from datetime import datetime, timedelta
from typing import Optional
import jwt
from jwt.exceptions import PyJWTError
from app.models import TokenData

SECRET_KEY = os.getenv("SECRET_KEY", "dev_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        if user_id is None:
            return None
        return TokenData(user_id=user_id, email=email)
    except PyJWTError:
        return None


from fastapi import HTTPException, Header, Cookie, Request


async def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        # Fallback to Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header:
            try:
                scheme, token_val = auth_header.split()
                if scheme.lower() == 'bearer':
                    token = token_val
            except ValueError:
                pass
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
            
    token_data = verify_token(token)
    if not token_data:
            raise HTTPException(status_code=401, detail="Invalid Token")
    return token_data
