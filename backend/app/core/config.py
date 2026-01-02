import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # MongoDB
    MONGODB_URI: str = os.getenv("MONGODB_URI", "")
    DATABASE_NAME: str = "lazytravelogue"

    # AI / LLM
    LLM_API_KEY: str = os.getenv("LLM_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    
    # Google Auth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    
    # Google Maps
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")
    
    # Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-for-dev")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    ALLOWED_ORIGINS: str = os.getenv(
        "ALLOWED_ORIGINS", 
        "http://localhost:5173,http://127.0.0.1:5173,https://lazy-travelogue.vercel.app"
    )

    # Environment
    VERCEL: bool = os.getenv("VERCEL") is not None
    PROD: bool = os.getenv("PROD") is not None

    @property
    def is_production(self) -> bool:
        return self.VERCEL or self.PROD

settings = Settings()
