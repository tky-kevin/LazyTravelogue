import json
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from app.services.rag_service import search_knowledge_base
from app.services.geocoding_service import GeocodingService
from app.core.config import settings
from app.core.logging import logger

class AIService:
    _llm_api_key = settings.LLM_API_KEY
    
    if _llm_api_key:
        genai.configure(api_key=_llm_api_key)

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
2. 保持親切但專業的語氣，適度使用 emoji增添親和力 ✨
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
- 每天建議安排 3-5 個活動
"""

    @classmethod
    async def get_chat_response(cls, message: str, history: List[Dict], context: Optional[Dict] = None):
        if not cls._llm_api_key:
            return {"error": "AI Service Config Missing (LLM_API_KEY)"}

        # 1. Search Knowledge Base
        kb_results = await search_knowledge_base(message)
        kb_text = ""
        sources = []
        if kb_results:
            kb_text = "\n\n## 📚 參考知識庫\n"
            for doc in kb_results:
                kb_text += f"**{doc['title']}**\n{doc['content']}\n\n"
                if not any(s['url'] == doc['url'] for s in sources):
                    sources.append({"title": doc['title'], "url": doc['url']})

        # 2. Construct System Prompt
        full_system_prompt = cls.SYSTEM_PROMPT
        if context:
            itinerary_info = f"""
## 📋 使用者當前行程狀態
- **行程名稱**：{context.get('title', '未命名行程')}
- **開始日期**：{context.get('startDate', '未設定')}
- **天數**：{context.get('days', 0)} 天
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

        # 3. Handle History
        gemini_history = []
        for msg in history:
            gemini_history.append({
                "role": "user" if msg.get("role") == "user" else "model",
                "parts": [msg.get("content", "")]
            })

        # 4. Check Intent
        intent_result = await cls.detect_plan_intent(message, history)
        
        if intent_result["is_planning"]:
            destination = intent_result.get("destination", "")
            days = intent_result.get("days", 3)
            preferences = intent_result.get("preferences", "")
            
            try:
                plan_data = await cls.generate_trip_plan(destination, days, preferences)
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
                logger.error(f"Auto-plan generation failed: {plan_error}")

        # 5. Regular Chat
        chat = model.start_chat(history=gemini_history)
        response = chat.send_message(message)

        if response.text:
            suggestions = await cls.generate_suggestions(message, response.text, context)
            return {
                "reply": response.text,
                "sources": sources,
                "suggestions": suggestions
            }
        else:
            return {"reply": "抱歉，我暫時無法生成回應，請稍後再試。 🤔"}

    @classmethod
    async def detect_plan_intent(cls, message: str, history: List[Dict]) -> Dict[str, Any]:
        """Detect if the user wants to generate a trip plan."""
        recent_context = ""
        if history:
            recent_msgs = history[-4:]
            for msg in recent_msgs:
                recent_context += f"{msg.get('role', 'user')}: {msg.get('content', '')}\n"
        
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
            logger.error(f"Intent detection error: {e}")
            return {"is_planning": False, "destination": "", "days": 3, "preferences": ""}

    @classmethod
    async def generate_suggestions(cls, user_msg: str, ai_reply: str, context: Optional[Dict] = None) -> List[Dict]:
        """Generate contextual action suggestions based on conversation."""
        suggestions = []
        user_lower = user_msg.lower()
        
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
            suggestions.append({"label": "🍜 推薦更多美食", "action": "ask", "message": "還有其他推薦的美食嗎？"})
        
        if any(kw in user_lower for kw in ["交通", "怎麼去", "搭什麼", "機票", "轉車"]):
            suggestions.append({"label": "🚃 查詢交通方式", "action": "ask", "message": "請問詳細的交通方式是什麼？"})
        
        if context and context.get("days", 0) > 0:
            suggestions.append({"label": "📝 優化我的行程", "action": "ask", "message": "請幫我優化目前的行程安排"})
        
        if not suggestions:
            suggestions = [
                {"label": "🗺️ 推薦台灣景點", "action": "ask", "message": "請推薦台灣熱門旅遊景點"},
                {"label": "🍽️ 台灣必吃美食", "action": "ask", "message": "台灣有什麼必吃美食？"},
                {"label": "💡 旅遊小提醒", "action": "ask", "message": "在台灣旅遊有什麼注意事項嗎？"}
            ]
        
        return suggestions[:3]

    @classmethod
    async def generate_trip_plan(cls, destination: str, days: int = 3, preferences: str = "") -> Dict:
        """Generate a complete trip plan."""
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        prompt = f"""
你是一個創意豐富的旅遊規劃師。請為使用者規劃一個前往 {destination} 的 {days} 天行程。
使用者偏好:{preferences or "無特別偏好"}

重要指示：
1. 請為這個行程取一個**獨特且吸引人的標題**。
2. 請根據地點的特色安排**多樣化**的活動。
3. 請確保每天的行程順路且合理。
4. 請提供**大概的經緯度**座標。

請以嚴格的 JSON 格式輸出：
{{
    "title": "獨特的行程標題",
    "days": [
        {{
            "id": "day-1",
            "date": "Day 1",
            "activities": [
                {{
                    "id": "act-unique-id",
                    "title": "地點名稱",
                    "category": "scenic|food|hotel|shopping|other",
                    "description": "簡短介紹",
                    "stayDuration": 60,
                    "transportMode": "DRIVING|WALKING|TRANSIT",
                    "lat": 25.0,
                    "lng": 121.0
                }}
            ]
        }}
    ]
}}
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
            logger.error(f"Geocoding error: {e}")
        
        return plan_data
