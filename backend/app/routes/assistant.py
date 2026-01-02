from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.auth import get_current_user
from app.models import TokenData
from app.services.ai_service import AIService

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    context: Optional[Dict[str, Any]] = None

@router.post("/assistant")
async def chat_with_ai(
    request: ChatRequest, user: TokenData = Depends(get_current_user)
):
    history_dicts = [msg.model_dump() for msg in request.history]
    
    result = await AIService.get_chat_response(
        message=request.message,
        history=history_dicts,
        context=request.context
    )
    
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    
    return result

class GeneratePlanRequest(BaseModel):
    destination: str
    days: int = 3
    preferences: Optional[str] = None

@router.post("/assistant/generate-plan")
async def generate_plan(
    request: GeneratePlanRequest, user: TokenData = Depends(get_current_user)
):
    try:
        plan_data = await AIService.generate_trip_plan(
            request.destination, 
            request.days, 
            request.preferences or ""
        )
        return plan_data

    except Exception as e:
        print(f"Plan Gen Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
