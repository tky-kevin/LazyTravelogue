from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import httpx
from app.auth import get_current_user
from app.models import TokenData

import google.generativeai as genai

router = APIRouter()
LLM_API_KEY = os.getenv("LLM_API_KEY")

if LLM_API_KEY:
    genai.configure(api_key=LLM_API_KEY)


class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None  # Current itinerary state


@router.post("/assistant")
async def chat_with_ai(
    request: ChatRequest, user: TokenData = Depends(get_current_user)
):
    if not LLM_API_KEY:
        raise HTTPException(
            status_code=503, detail="AI Service Config Missing (LLM_API_KEY)"
        )

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")

        system_instruction = (
            "You are a helpful travel assistant for LazyTravelogue. "
            "Help the user plan their trip, suggest locations, or organize their itinerary. "
            "Keep responses friendly, concise, and helpful. "
            "response in Traditional Chinese"
        )

        if request.context:
            system_instruction += f"\n\n[Current Itinerary Context]:\n{request.context}"

        full_prompt = f"{system_instruction}\n\nUser Question: {request.message}"

        response = model.generate_content(full_prompt)

        # Check if response is valid
        if response.text:
            return {"reply": response.text}
        else:
            return {"reply": "Sorry, I couldn't generate a response. Please try again."}

    except Exception as e:
        print(f"Gemini API Error: {str(e)}")
        # Fallback for error viewing in dev (don't expose in prod usually)
        return {"reply": f"🤖 AI Service Error: {str(e)}"}
