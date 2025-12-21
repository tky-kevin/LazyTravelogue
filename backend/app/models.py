from pydantic import BaseModel, Field, EmailStr, BeforeValidator, ConfigDict
from typing import Optional, List, Dict, Any, Annotated
from datetime import datetime
from bson import ObjectId

# Helper for Pydantic v2 + MongoDB ObjectId
PyObjectId = Annotated[str, BeforeValidator(str)]

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
    transitDetails: Optional[List[Dict[str, Any]]] = None
    alternatives: Optional[List[Dict[str, Any]]] = None

class Day(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    date: str # YYYY-MM-DD or "Day X"
    activities: List[Location] = []

class Itinerary(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: Optional[str] = None
    title: str = "My Trip"
    
    # Changed from Dict to List for better ordering/handling
    days: List[Day] = []
    
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    
    # Pocket List for unassigned locations
    pocket_list: List[Location] = []
    
    start_times: Dict[str, str] = {} # Backward compatibility or separate handling
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Sharing
    is_public: bool = False
    share_token: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "title": "Taipei Trip",
                "days": [
                    {
                        "id": "day-1",
                        "date": "2024-01-01",
                        "activities": []
                    }
                ]
            }
        }
    )

class ItineraryUpdate(BaseModel):
    title: Optional[str] = None
    days: Optional[List[Day]] = None
    start_times: Optional[Dict[str, str]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    pocket_list: Optional[List[Location]] = None

class KnowledgeArticle(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    url: str
    title: str
    content_chunk: str
    embedding: Optional[List[float]] = None # Vector for Atlas Search
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "url": "https://example.com/travel-guide",
                "title": "Taipei Guide",
                "content_chunk": "Taipei 101 is...",
                "embedding": [0.1, 0.2, 0.3]
            }
        }
    )
