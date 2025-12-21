from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Optional
from app.models import Itinerary, TokenData, ItineraryUpdate
from app.auth import verify_token, get_current_user
from app.services.itinerary_service import ItineraryService

router = APIRouter()


@router.get("/itineraries", response_model=List[Itinerary])
async def get_itineraries(user: TokenData = Depends(get_current_user)):
    return await ItineraryService.get_all_by_user(user.user_id)


@router.post("/itineraries", response_model=Itinerary)
async def create_itinerary(
    itinerary: Itinerary, user: TokenData = Depends(get_current_user)
):
    return await ItineraryService.create(itinerary, user.user_id)


@router.put("/itineraries/{itinerary_id}", response_model=Itinerary)
async def update_itinerary(
    itinerary_id: str, itinerary: Itinerary, user: TokenData = Depends(get_current_user)
):
    return await ItineraryService.update_full(itinerary_id, user.user_id, itinerary)


@router.patch("/itineraries/{itinerary_id}", response_model=Itinerary)
async def patch_itinerary(
    itinerary_id: str,
    update_data: ItineraryUpdate,
    user: TokenData = Depends(get_current_user),
):
    try:
        return await ItineraryService.update_partial(
            itinerary_id, user.user_id, update_data
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/itineraries/{itinerary_id}")
async def delete_itinerary(
    itinerary_id: str, user: TokenData = Depends(get_current_user)
):
    success = await ItineraryService.delete(itinerary_id, user.user_id)
    if not success:
        raise HTTPException(
            status_code=404, detail="Itinerary not found or permission denied"
        )
    return {"message": "Itinerary deleted"}


@router.put("/itineraries/{itinerary_id}/share", response_model=Itinerary)
async def share_itinerary(
    itinerary_id: str,
    is_public: bool = Body(..., embed=True),
    user: TokenData = Depends(get_current_user),
):
    return await ItineraryService.enable_sharing(itinerary_id, user.user_id, is_public)


@router.get("/public/itineraries/{token}", response_model=Itinerary)
async def get_public_itinerary(token: str):
    return await ItineraryService.get_by_share_token(token)
