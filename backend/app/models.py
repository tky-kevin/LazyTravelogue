from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

class User(BaseModel):
    google_id: str
    email: EmailStr
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TokenData(BaseModel):
    user_id: str
    email: str

class Location(BaseModel):
    id: str
    title: str
    category: str
    lat: float
    lng: float
    transportMode: Optional[str] = "DRIVING" # default
    stayDuration: int = 60 # minutes
    durationValue: int = 0
    distance: Optional[str] = None
    duration: Optional[str] = None
    description: Optional[str] = None

class Itinerary(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    user_id: Optional[str] = None
    title: str = "My Trip"
    days: Dict[str, List[Location]] # "Day 1": [...]
    start_times: Dict[str, str] # "Day 1": "09:00"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "title": "Taipei Trip",
                "days": {
                    "Day 1": []
                },
                "start_times": {
                    "Day 1": "09:00"
                }
            }
        }
