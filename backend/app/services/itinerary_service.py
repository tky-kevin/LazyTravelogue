from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from fastapi import HTTPException

from app.database import get_database
from app.models import Itinerary, ItineraryUpdate, Day

class ItineraryService:
    @staticmethod
    async def get_all_by_user(user_id: str) -> List[Itinerary]:
        db = get_database()
        cursor = db["itineraries"].find({"user_id": user_id}).sort("updated_at", -1)
        itineraries = await cursor.to_list(None)
        return [Itinerary(**doc) for doc in itineraries]

    @staticmethod
    async def get_one(itinerary_id: str, user_id: str) -> Itinerary:
        db = get_database()
        if not ObjectId.is_valid(itinerary_id):
            raise HTTPException(status_code=400, detail="Invalid ID format")
            
        doc = await db["itineraries"].find_one({"_id": ObjectId(itinerary_id), "user_id": user_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Itinerary not found")
        return Itinerary(**doc)

    @staticmethod
    async def create(itinerary: Itinerary, user_id: str) -> Itinerary:
        db = get_database()
        itinerary.user_id = user_id
        
        # Ensure default day if empty
        if not itinerary.days:
            itinerary.days = [
                Day(id="day-1", date="Day 1", activities=[])
            ]
            
        doc = itinerary.model_dump(by_alias=True, exclude={"id"})
        result = await db["itineraries"].insert_one(doc)
        
        created = await db["itineraries"].find_one({"_id": result.inserted_id})
        return Itinerary(**created)

    @staticmethod
    async def update_full(itinerary_id: str, user_id: str, update_data: Itinerary) -> Itinerary:
        # Backward compatibility for PUT
        db = get_database()
        
        # Verify existence
        await ItineraryService.get_one(itinerary_id, user_id)
        
        data = update_data.model_dump(exclude={"id", "user_id", "created_at", "updated_at"})
        data["updated_at"] = datetime.utcnow()
        
        await db["itineraries"].update_one(
            {"_id": ObjectId(itinerary_id)},
            {"$set": data}
        )
        
        return await ItineraryService.get_one(itinerary_id, user_id)

    @staticmethod
    async def update_partial(itinerary_id: str, user_id: str, update_data: ItineraryUpdate) -> Itinerary:
        db = get_database()
        
        # Verify existence
        await ItineraryService.get_one(itinerary_id, user_id)
        
        # Filter out None values
        data = update_data.model_dump(exclude_unset=True)
        if not data:
            return await ItineraryService.get_one(itinerary_id, user_id)
            
        data["updated_at"] = datetime.utcnow()
        
        await db["itineraries"].update_one(
            {"_id": ObjectId(itinerary_id)},
            {"$set": data}
        )
        
        return await ItineraryService.get_one(itinerary_id, user_id)

    @staticmethod
    async def delete(itinerary_id: str, user_id: str) -> bool:
        db = get_database()
        result = await db["itineraries"].delete_one({"_id": ObjectId(itinerary_id), "user_id": user_id})
        return result.deleted_count > 0

    @staticmethod
    async def enable_sharing(itinerary_id: str, user_id: str, is_public: bool) -> Itinerary:
        db = get_database()
        
        # Verify ownership
        await ItineraryService.get_one(itinerary_id, user_id)
        
        update_fields = {"is_public": is_public, "updated_at": datetime.utcnow()}
        
        if is_public:
            # Check if token already exists to avoid refreshing it unnecessarily
            existing = await db["itineraries"].find_one({"_id": ObjectId(itinerary_id)})
            if not existing.get("share_token"):
                import secrets
                update_fields["share_token"] = secrets.token_urlsafe(16)
        
        await db["itineraries"].update_one(
            {"_id": ObjectId(itinerary_id)},
            {"$set": update_fields}
        )
        
        return await ItineraryService.get_one(itinerary_id, user_id)

    @staticmethod
    async def get_by_share_token(token: str) -> Itinerary:
        db = get_database()
        doc = await db["itineraries"].find_one({"share_token": token, "is_public": True})
        if not doc:
            raise HTTPException(status_code=404, detail="Itinerary not found or not public")
        return Itinerary(**doc)
