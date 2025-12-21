from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import json
from app.auth import get_current_user
from app.models import TokenData
from app.services.rag_service import search_knowledge_base

import google.generativeai as genai

router = APIRouter()
LLM_API_KEY = os.getenv("LLM_API_KEY") or os.getenv("GOOGLE_API_KEY")

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
        # 1. Search Knowledge Base (RAG)
        kb_results = await search_knowledge_base(request.message)
        
        # Format context for LLM
        kb_text = ""
        sources = []
        if kb_results:
            kb_text = "參考資料 (Reference Knowledge):\n"
            for doc in kb_results:
                kb_text += f"- Title: {doc['title']}\n  Content: {doc['content']}\n\n"
                
                # Deduplicate sources for UI
                if not any(s['url'] == doc['url'] for s in sources):
                    sources.append({"title": doc['title'], "url": doc['url']})

        model = genai.GenerativeModel("gemini-2.5-flash") # Using 2.5 flash as requested

        system_instruction = (
            "You are a helpful '旅遊小精靈'. "
            "Help the user plan their trip, suggest locations, or organize their itinerary. "
            "If the user asks a specific question, first check the [Reference Knowledge] context provided below. "
            "If the reference contains relevant information, prioritizing using it to answer. "
            "If the reference is not relevant or empty, rely on your own knowledge. "
            "Always respond in Traditional Chinese (繁體中文)."
        )

        if request.context:
            system_instruction += f"\n\n[Current User Itinerary]:\n{request.context}"
        
        if kb_text:
            system_instruction += f"\n\n{kb_text}"

        full_prompt = f"{system_instruction}\n\nUser Question: {request.message}"

        response = model.generate_content(full_prompt)

        if response.text:
            return {
                "reply": response.text,
                "sources": sources  # Return sources to frontend
            }
        else:
            return {"reply": "抱歉，我暫時無法生成回應，請稍後再試。"}

    except Exception as e:
        print(f"Gemini API Error: {str(e)}")
        return {"reply": f"🤖 AI 服務錯誤: {str(e)}"}

class GeneratePlanRequest(BaseModel):
    destination: str
    days: int = 3
    preferences: Optional[str] = None

@router.post("/assistant/generate-plan")
async def generate_plan(
    request: GeneratePlanRequest, user: TokenData = Depends(get_current_user)
):
    if not LLM_API_KEY:
        raise HTTPException(status_code=503, detail="AI Config Missing")

    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        prompt = f"""
        你是一個創意豐富的旅遊規劃師。請為使用者規劃一個前往 {request.destination} 的 {request.days} 天行程。
        使用者偏好：{request.preferences or "無特別偏好"}
        
        重要指示：
        1. 請為這個行程取一個**獨特且吸引人的標題**，不要使用通用的「文化探索之旅」或類似模板。
        2. 請根據地點的特色安排**多樣化**的活動，避免每天都只排大景點。
        3. 請確保每天的行程順路且合理。
        
        請以嚴格的 JSON 格式輸出，必須符合以下結構，不要加入任何其他文字：
        {{
            "title": "獨特的行程標題",
            "days": [
                {{
                    "date": "Day 1",
                    "activities": [
                        {{
                            "id": "隨機唯一ID",
                            "title": "地點名稱",
                            "category": "scenic/food/hotel/transport",
                            "description": "簡短介紹",
                            "stayDuration": 60,
                            "lat": 25.0330,  
                            "lng": 121.5654
                        }}
                    ]
                }}
            ]
        }}
        
        Schema 限制：
        1. "id" 必須是唯一的字串。
        2. category 只能是: "scenic", "food", "hotel", "transport"。
        3. 經緯度 (lat, lng) 必須準確。
        4. 語言：繁體中文。
        """
        
        response = model.generate_content(prompt)
        # Extract JSON from markdown if exists
        text = response.text
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
            
        plan_data = json.loads(text)
        return plan_data

    except Exception as e:
        print(f"Plan Gen Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
