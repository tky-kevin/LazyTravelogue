from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests
from app.database import get_database
from app.models import User
from app.auth import create_access_token
import os

router = APIRouter()
CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")


class GoogleAuthRequest(BaseModel):
    credential: str  # The Google ID Token


@router.post("/auth/google")
async def google_login(request: GoogleAuthRequest, response: Response):
    token = request.credential

    try:
        # Verify the token with Google
        id_info = id_token.verify_oauth2_token(token, requests.Request(), CLIENT_ID)

        # Get User Info
        google_id = id_info["sub"]
        email = id_info["email"]
        name = id_info.get("name", "Unknown")
        picture = id_info.get("picture")

        db = get_database()
        users_collection = db["users"]

        # Check if user exists
        user = await users_collection.find_one({"google_id": google_id})

        if not user:
            # Create new user
            new_user = User(
                google_id=google_id, email=email, name=name, picture=picture
            )
            await users_collection.insert_one(new_user.model_dump())
            user_id = google_id
        else:
            user_id = user["google_id"]

        # Create Session Token (JWT)
        access_token = create_access_token(data={"sub": user_id, "email": email})

        # Determine environment
        is_production = os.getenv("VERCEL") or os.getenv("PROD")
        
        # Set HttpOnly Cookie
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=True if is_production else False,  # False for localhost http
            samesite="none" if is_production else "lax",  # Adjust for cross-site
            max_age=60 * 60 * 24 * 7 # 7 days
        )

        return {
            "message": "Login successful",
            "access_token": access_token,
            "user": {"name": name, "email": email, "picture": picture},
        }

    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google Token")
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out"}
