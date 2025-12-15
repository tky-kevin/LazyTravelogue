from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from app.database import get_database
from app.models import Itinerary, TokenData
from app.auth import verify_token, get_current_user
from fastapi.security import OAuth2PasswordBearer
from fastapi import Header

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/google")


@router.get("/itineraries", response_model=List[Itinerary])
async def get_itineraries(user: TokenData = Depends(get_current_user)):
    db = get_database()
    itineraries = await db["itineraries"].find({"user_id": user.user_id}).to_list(100)
    
    # Map _id to id string
    for doc in itineraries:
        doc["_id"] = str(doc["_id"])
        
    return itineraries

@router.post("/itineraries", response_model=Itinerary)
async def create_itinerary(itinerary: Itinerary, user: TokenData = Depends(get_current_user)):
    db = get_database()
    
    # Enforce user ownership
    itinerary.user_id = user.user_id
    itinerary_dict = itinerary.model_dump(by_alias=True, exclude={"id"})
    
    new_iten = await db["itineraries"].insert_one(itinerary_dict)
    
    # Return created item
    created_iten = await db["itineraries"].find_one({"_id": new_iten.inserted_id})
    created_iten["_id"] = str(created_iten["_id"])
    return created_iten

@router.put("/itineraries/{itinerary_id}", response_model=Itinerary)
async def update_itinerary(itinerary_id: str, itinerary_update: Itinerary, user: TokenData = Depends(get_current_user)):
    db = get_database()
    
    # Ensure it exists and belongs to user
    existing = await db["itineraries"].find_one({"_id": ObjectId(itinerary_id), "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Itinerary not found")
        
    update_data = itinerary_update.model_dump(exclude={"id", "user_id", "created_at", "updated_at"})
    update_data["updated_at"] = datetime.utcnow()
    
    await db["itineraries"].update_one(
        {"_id": ObjectId(itinerary_id)},
        {"$set": update_data}
    )
    
    updated_doc = await db["itineraries"].find_one({"_id": ObjectId(itinerary_id)})
    updated_doc["_id"] = str(updated_doc["_id"])
    return updated_doc

@router.delete("/itineraries/{itinerary_id}")
async def delete_itinerary(itinerary_id: str, user: TokenData = Depends(get_current_user)):
    db = get_database()
    
    result = await db["itineraries"].delete_one({"_id": ObjectId(itinerary_id), "user_id": user.user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Itinerary not found or permission denied")
        
    return {"message": "Itinerary deleted"}
