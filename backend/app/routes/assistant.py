from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import json
from app.auth import get_current_user
from app.models import TokenData
from app.services.rag_service import search_knowledge_base
from app.services.geocoding_service import GeocodingService

import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

router = APIRouter()
LLM_API_KEY = os.getenv("LLM_API_KEY") or os.getenv("GOOGLE_API_KEY")

if LLM_API_KEY:
    genai.configure(api_key=LLM_API_KEY)


SYSTEM_PROMPT = """
你是 LazyTravelogue 的「旅遊小精靈」，一個專業、友善且富有創意的旅遊規劃 AI 助理。

## 🎯 核心能力
1. **行程規劃**：根據使用者需求（天數、預算、興趣）規劃完整行程
2. **景點推薦**：推薦當地必去景點、特色美食、優質住宿
3. **行程優化**：協助調整現有行程的順序、時間分配
4. **旅遊諮詢**：回答交通方式、天氣資訊、當地文化、費用預算等問題
5. **個人化建議**：根據使用者偏好（親子、情侶、背包客等）給予客製化建議

## 💬 對話風格
1. 永遠使用**繁體中文**回答
2. 保持親切但專業的語氣，適度使用 emoji 增添親和力 ✨
3. 回答要有條理，善用列表和分段
4. 給出具體建議時，盡量附上實用資訊（營業時間、價格範圍、交通方式）
5. 適時詢問使用者偏好以提供更精準的建議

## 🧠 知識運用規則
1. **優先**參考 [參考知識庫] 中提供的資料，這些是經過驗證的旅遊資訊
2. 若知識庫資料不足或不相關，則使用內建知識回答
3. 若不確定資訊的準確性，請誠實告知並建議查證
4. 提供的經緯度座標必須準確，以便系統正確顯示於地圖

## 🗺️ 行程規劃指南
當使用者要求規劃行程時：
- 詢問天數、預算範圍、旅伴類型（若未提供）
- 考慮景點之間的距離與交通時間
- 安排合理的用餐時間
- 避免過度緊湊，留有彈性時間
- 每天建議安排 3-5 個主要活動

## ⚠️ 注意事項
- 避免推薦可能已關閉或季節性限定的景點，除非特別說明
- 對於敏感話題（政治、宗教）保持中立
- 不提供違法 or 危險活動的建議
"""


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
    if not LLM_API_KEY:
        raise HTTPException(
            status_code=503, detail="AI Service Config Missing (LLM_API_KEY)"
        )

    try:
        kb_results = await search_knowledge_base(request.message)
        
        kb_text = ""
        sources = []
        if kb_results:
            kb_text = "\n\n## 📚 參考知識庫\n"
            for doc in kb_results:
                kb_text += f"**{doc['title']}**\n{doc['content']}\n\n"
                
                if not any(s['url'] == doc['url'] for s in sources):
                    sources.append({"title": doc['title'], "url": doc['url']})

        full_system_prompt = SYSTEM_PROMPT
        
        if request.context:
            itinerary_info = f"""

## 📋 使用者當前行程狀態
- **行程名稱**：{request.context.get('title', '未命名行程')}
- **開始日期**：{request.context.get('startDate', '未設定')}
- **天數**：{request.context.get('days', 0)} 天
"""
            full_system_prompt += itinerary_info
        
        if kb_text:
            full_system_prompt += kb_text

        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=full_system_prompt,
            safety_settings={
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            }
        )

        gemini_history = []
        for msg in request.history:
            gemini_history.append({
                "role": "user" if msg.role == "user" else "model",
                "parts": [msg.content]
            })

        intent_result = await detect_plan_intent(request.message, request.history)
        
        if intent_result["is_planning"]:
            destination = intent_result.get("destination", "")
            days = intent_result.get("days", 3)
            preferences = intent_result.get("preferences", "")
            
            try:
                plan_data = await generate_trip_plan(destination, days, preferences)
                
                chat = model.start_chat(history=gemini_history)
                response = chat.send_message(
                    f"使用者想規劃 {destination} 的 {days} 天行程。請用友善的方式告訴他你已經幫他規劃好了，簡單介紹一下行程亮點，並邀請他查看或匯入行程。不要列出完整行程細節。"
                )
                
                return {
                    "reply": response.text if response.text else f"好的！我已經為您規劃了 {destination} 的 {days} 天行程 ✨",
                    "sources": sources,
                    "plan": plan_data,
                    "suggestions": [
                        {"label": "🗓️ 改成 5 天行程", "action": "modify_days", "days": 5},
                        {"label": "🎒 以背包客風格重新規劃", "action": "regenerate", "preferences": "背包客、預算有限"},
                        {"label": "👨‍👩‍👧 以親子旅遊重新規劃", "action": "regenerate", "preferences": "親子旅遊、適合小孩"}
                    ]
                }
            except Exception as plan_error:
                print(f"Auto-plan generation failed: {plan_error}")

        chat = model.start_chat(history=gemini_history)
        response = chat.send_message(request.message)

        if response.text:
            suggestions = await generate_suggestions(request.message, response.text, request.context)
            
            return {
                "reply": response.text,
                "sources": sources,
                "suggestions": suggestions
            }
        else:
            return {"reply": "抱歉，我暫時無法生成回應，請稍後再試。 🤔"}

    except Exception as e:
        print(f"Gemini API Error: {str(e)}")
        return {"reply": f"🤖 AI 服務錯誤：{str(e)}"}


async def detect_plan_intent(message: str, history: List[ChatMessage]) -> Dict[str, Any]:
    """Detect if the user wants to generate a trip plan."""
    recent_context = ""
    if history:
        recent_msgs = history[-4:]
        for msg in recent_msgs:
            recent_context += f"{msg.role}: {msg.content}\n"
    
    detection_prompt = f"""
分析以下對話，判斷使用者是否想要「生成/規劃完整旅行行程」。

對話歷史：
{recent_context}

最新訊息：{message}

請以嚴格 JSON 格式回應，不要加入任何其他文字：
{{
    "is_planning": true/false,
    "destination": "目的地名稱（如果有提到）",
    "days": 天數（數字，預設3）,
    "preferences": "使用者偏好（如：美食、親子、背包客等）"
}}

判斷規則：
- 如果使用者明確說「幫我規劃」「安排行程」「規劃去XX」「我想去XX玩」等，is_planning = true
- 如果只是問問題、詢問景點、或一般聊天，is_planning = false
- 如果使用者只是說「我想去XX」但沒有明確要規劃行程，也算 is_planning = true
"""
    
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(detection_prompt)
        
        text = response.text
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        
        result = json.loads(text)
        return {
            "is_planning": result.get("is_planning", False),
            "destination": result.get("destination", ""),
            "days": result.get("days", 3),
            "preferences": result.get("preferences", "")
        }
    except Exception as e:
        print(f"Intent detection error: {e}")
        return {"is_planning": False, "destination": "", "days": 3, "preferences": ""}


async def generate_suggestions(user_msg: str, ai_reply: str, context: Optional[Dict] = None) -> List[Dict]:
    """Generate contextual action suggestions based on conversation."""
    suggestions = []
    
    user_lower = user_msg.lower()
    reply_lower = ai_reply.lower()
    
    taiwan_destinations = ["台北", "新北", "桃園", "台中", "台南", "高雄", "基隆", "新竹", "嘉義", "宜蘭", "花蓮", "台東", "澎湖", "金門", "墾丁", "日月潭", "阿里山", "九份", "淡水"]
    mentioned_dest = None
    for dest in taiwan_destinations:
        if dest in user_msg or dest in ai_reply:
            mentioned_dest = dest
            break
    
    if mentioned_dest:
        suggestions.append({
            "label": f"✨ 規劃 {mentioned_dest} 行程",
            "action": "generate_plan",
            "destination": mentioned_dest
        })
    
    if any(kw in user_lower for kw in ["吃", "美食", "餐廳", "小吃", "推薦吃"]):
        suggestions.append({
            "label": "🍜 推薦更多美食",
            "action": "ask",
            "message": "還有其他推薦的美食嗎？"
        })
    
    if any(kw in user_lower for kw in ["交通", "怎麼去", "搭什麼", "機票", "轉車"]):
        suggestions.append({
            "label": "🚃 查詢交通方式",
            "action": "ask",
            "message": "請問詳細的交通方式是什麼？"
        })
    
    if context and context.get("days", 0) > 0:
        suggestions.append({
            "label": "📝 優化我的行程",
            "action": "ask",
            "message": "請幫我優化目前的行程安排"
        })
    
    if not suggestions:
        suggestions = [
            {"label": "🗺️ 推薦台灣景點", "action": "ask", "message": "請推薦台灣熱門旅遊景點"},
            {"label": "🍽️ 台灣必吃美食", "action": "ask", "message": "台灣有什麼必吃美食？"},
            {"label": "💡 旅遊小提醒", "action": "ask", "message": "在台灣旅遊有什麼注意事項嗎？"}
        ]
    
    return suggestions[:3]


async def generate_trip_plan(destination: str, days: int = 3, preferences: str = "") -> Dict:
    """Generate a complete trip plan."""
    model = genai.GenerativeModel("gemini-2.5-flash")
    
    prompt = f"""
你是一個創意豐富的旅遊規劃師。請為使用者規劃一個前往 {destination} 的 {days} 天行程。
使用者偏好:{preferences or "無特別偏好"}

重要指示：
1. 請為這個行程取一個**獨特且吸引人的標題**，不要使用通用的「文化探索之旅」或類似模板。
2. 請根據地點的特色安排**多樣化**的活動，避免每天都只排大景點。
3. 請確保每天的行程順路且合理。
4. 請提供**大概的經緯度**座標（不需要非常精確，系統會自動透過 Google Maps 修正）。

請以嚴格的 JSON 格式輸出，必須符合以下結構，不要加入任何其他文字：
{{
    "title": "獨特的行程標題",
    "days": [
        {{
            "id": "day-1",
            "date": "Day 1",
            "activities": [
                {{
                    "id": "act-{destination[:2]}-1-1",
                    "title": "地點名稱",
                    "category": "scenic",
                    "description": "簡短介紹",
                    "stayDuration": 60,
                    "transportMode": "DRIVING",
                    "lat": 25.0330,
                    "lng": 121.5654
                }}
            ]
        }}
    ]
}}

Schema 限制：
1. 每個 day 必須有 "id" (如 "day-1", "day-2")
2. 每個 activity 的 "id" 必須是唯一的字串
3. category 必須使用以下英文值之一:
   - "food"
   - "scenic"
   - "hotel"
   - "shopping"
   - "other"
4. 經緯度 (lat, lng) 請提供大概位置即可，系統會自動透過 Google Maps 修正為精確座標
5. transportMode 必須是: "DRIVING", "WALKING", "TRANSIT"
6. 語言：繁體中文（但 category 使用英文）
"""
    
    response = model.generate_content(prompt)
    text = response.text
    
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    
    plan_data = json.loads(text)
    
    try:
        plan_data = await GeocodingService.geocode_itinerary_activities(plan_data)
    except Exception as e:
        print(f"Geocoding error: {e}")
    
    return plan_data


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
        plan_data = await generate_trip_plan(
            request.destination, 
            request.days, 
            request.preferences or ""
        )
        return plan_data

    except Exception as e:
        print(f"Plan Gen Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
