
# LazyTravelogue 慵懶旅誌

**LazyTravelogue** 是一個現代化、智慧型的旅遊行程規劃平台，旨在解決傳統行程安排繁瑣、時間計算困難以及資訊分散的痛點。透過直覺的拖曳操作與 AI 輔助，使用者能夠以最慵懶的方式，安排最完美的旅程。

本專案結合了動態地圖視覺化、自動交通時間計算以及 RAG 技術的 AI 旅遊助手，提供從靈感到落地執行的一站式體驗。

---

## 核心特色

### 1. 直覺式行程排程與自動計算
- **拖曳排序**：透過 Framer Motion 實現流暢的拖曳體驗，輕鬆調整景點順序，直覺管理多天行程。
- **智慧時間軸**：系統會根據景點間的距離與交通方式（開車、步行等），自動計算並更新後續行程的時間點，無需手動推算。
- **路徑最佳化**：內建2-opt演算法可根據地理位置，為使用者建議最佳的遊玩順序，減少繞路時間。

### 2. 深度整合 Google Maps
- **即時地圖連動**：行程列表與地圖雙向連動，點擊卡片即定位地圖，調整地圖即更新列表。
- **地點搜尋與資訊**：整合 Google Places API，提供精確的地點搜尋、照片預覽及詳細資訊。
- **路線視覺化**：在地圖上清晰繪製每日的移動路徑，讓行程動線一目瞭然。

### 3. AI 旅遊助手 (RAG 技術驅動)
- **客製化推薦**：基於 LLM 與 RAG 技術，助手能根據使用者的偏好推薦景點、美食或住宿。
- **一鍵生成行程**：只需輸入目的地（如「台南三天兩夜」），AI 即可自動生成包含景點、時間安排的完整草稿，並可直接匯入編輯器。
- **即時問答**：在規劃過程中隨時呼叫助手，查詢交通建議或景點特色。

### 4. 口袋名單
- **靈活暫存**：在搜尋過程中感興趣但未確定時間的地點，可先加入口袋名單。
- **快速分發**：支援從口袋名單直接將地點加入行程中。

### 5. 安全便捷的登入系統
- **Google 登入**：支援 Google OAuth 快速登入，安全地儲存與同步使用者的所有行程資料。

### 6. 響應式與現代化 UI 設計
- **行動體驗**：針對手機端優化的介面，包含滑動切換視圖（行程/地圖/助手）與觸控友善的元件。
- **沈浸美學**：採用質感配色與細膩的微互動動畫，提供類似原生 App 的流暢操作感。

---

## 技術架構

### 前端
- **核心框架**: React 18, Vite
- **狀態管理**: Context API, Custom Hooks
- **樣式與 UI**: Tailwind CSS, PostCSS
- **動畫互動**: Framer Motion (用於複雜的列表排序與轉場動畫)
- **地圖整合**: @react-google-maps/api
- **其他工具**: Date-fns (時間處理), Lucide React (圖示), React Hot Toast (通知)

### 後端
- **核心框架**: Python FastAPI
- **資料庫**: MongoDB (儲存使用者行程、景點資料)
- **AI 整合**: 
    - LangChain (RAG 流程構建)
    - Google Gemini / OpenAI (LLM 模型)
    - MongoDB Atlas Vector Search (高效能向量檢索)
- **排程服務**: APScheduler (用於定期爬取或更新景點資料)
- **爬蟲**: Playwright / BeautifulSoup (用於豐富景點資料庫)

---

## 快速開始

### 前置需求
- Node.js (v18+)
- Python (v3.9+)
- MongoDB
- Google Maps API Key

### 安裝與執行

#### 1. 後端設定
```bash
cd backend
# 建立虛擬環境 (建議)
python -m venv venv
# 啟動虛擬環境 (Windows)
.\venv\Scripts\activate
# 安裝依賴
pip install -r requirements.txt

# 設定環境變數 (.env)
cp .env.example .env
# 請確保 .env 包含以下變數：
# MONGODB_URI=mongodb+srv://...
# GOOGLE_API_KEY=AI_Gemini_Key
# GOOGLE_MAPS_API_KEY=Backend_Maps_Key
# GOOGLE_CLIENT_ID=Oauth_Client_ID
# SECRET_KEY=your_secret
# ALLOWED_ORIGINS=http://localhost:5173

# 啟動伺服器
python main.py
# 或使用開發模式
uvicorn app.main:app --reload
```

#### 2. 前端設定
```bash
cd frontend
# 安裝依賴
npm install

# 設定環境變數 (.env)
# 建立 .env 檔案並填入：
# VITE_GOOGLE_MAPS_API_KEY=您的前端地圖金鑰
# VITE_GOOGLE_CLIENT_ID=您的OAuth_Client_ID
# VITE_API_URL=http://localhost:8000 (通常開發時為此預設值)

# 啟動開發伺服器
npm run dev
```

開啟瀏覽器並訪問 `http://localhost:5173` 即可開始使用。

---

## 專案結構概覽

```
LazyTravelogue/
├── backend/
│   ├── app/
│   │   ├── services/      # 核心業務邏輯 (爬蟲, RAG, 行程計算)
│   │   ├── routes/        # API 路由定義
│   │   ├── models/        # Pydantic 資料模型
│   │   └── core/          # 全域設定與 Config
│   └── scripts/           # 資料庫測試與維護腳本
│
└── frontend/
    ├── src/
    │   ├── api/           # Axios 設定與 API 請求封裝
    │   ├── components/    # React 元件 (Navbar, ItineraryPanel, MapPanel...)
    │   ├── context/       # 全域狀態 (ItineraryContext)
    │   ├── hooks/         # Custom Hooks
    │   └── utils/         # 工具函式 (時間計算, 地點分類)
    └── public/
```

