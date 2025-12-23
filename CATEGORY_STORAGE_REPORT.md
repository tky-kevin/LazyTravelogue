# 行程卡片類別 (Category) 儲存狀態報告

## 問題
**行程卡片的類別有儲存在資料庫中嗎？**

## 答案
**✅ 是的，有儲存！**

---

## 詳細分析

### 1. 資料模型定義

**文件**: `backend/app/models.py` (第 20-33 行)

```python
class Location(BaseModel):
    id: str
    title: str
    category: str        # ✅ 類別欄位
    lat: float
    lng: float
    transportMode: Optional[str] = "DRIVING"
    stayDuration: int = 60
    durationValue: int = 0
    distance: Optional[str] = None
    duration: Optional[str] = None
    description: Optional[str] = None
    transitDetails: Optional[List[Dict[str, Any]]] = None
    alternatives: Optional[List[Dict[str, Any]]] = None
```

**關鍵點**:
- `category: str` 欄位是**必填欄位**（沒有 Optional）
- 每個活動 (Location) 都必須包含類別資訊

---

### 2. 前端發送格式

#### 從 Google Maps 搜尋添加景點
**文件**: `frontend/src/components/Navbar.jsx` & `MapPanel.jsx`

```javascript
{
    id: generateId(),
    title: place.name,
    category: categorizePlace(place.types),  // ✅ 自動分類
    lat: place.geometry.location.lat(),
    lng: place.geometry.location.lng(),
    // ...
}
```

#### 類別自動分類邏輯
**文件**: `frontend/src/utils/placeUtils.js`

根據 Google Places API 返回的 `types`，自動分類為以下類別：

| 英文 ID | 中文顯示 | Google Place Types |
|---------|---------|-------------------|
| `food` | 美食 | restaurant, food, cafe, bakery, bar, meal_takeaway |
| `shopping` | 購物 | shopping_mall, store, clothing_store, supermarket |
| `scenic` | 景點 | tourist_attraction, museum, art_gallery, temple, church |
| `hotel` | 住宿 | lodging |
| `other` | 其他 | (默認) |

---

### 3. 用戶手動編輯類別

**文件**: `frontend/src/components/ItineraryPanel.jsx` (第 22-28 行)

```javascript
const CATEGORY_OPTIONS = [
    { id: 'food', label: '美食', icon: Utensils },
    { id: 'scenic', label: '景點', icon: Camera },
    { id: 'hotel', label: '住宿', icon: Hotel },
    { id: 'shopping', label: '購物', icon: ShoppingBag },
    { id: 'other', label: '其他', icon: MapPin },
];
```

用戶可以在編輯模式下手動更改活動的類別，變更會立即儲存到資料庫。

---

### 4. 資料庫儲存流程

```
前端添加/編輯活動
    ↓
包含 category 欄位的 Location 物件
    ↓
PUT/PATCH /api/itineraries/{id}
    ↓
後端 Pydantic 模型驗證（category 為必填）
    ↓
MongoDB 儲存完整的 Location 物件（包含 category）
    ↓
讀取時完整返回（包含 category）
```

---

### 5. 使用場景

#### ✅ 儲存時機
1. **Google Maps 搜尋添加景點** - 自動分類並儲存
2. **AI 生成行程** - AI 返回的景點數據包含 category
3. **用戶手動編輯** - 更改類別後立即更新資料庫
4. **從口袋名單添加** - 口袋項目本身就有 category

#### ✅ 讀取應用
1. **顯示圖示** - 根據類別顯示不同的圖示（美食🍴、景點📷、住宿🏨）
2. **顏色區分** - 不同類別有不同的背景顏色和邊框
3. **過濾排序** - 未來可以根據類別過濾或分組活動

---

## 結論

### ✅ 儲存狀態: **完全儲存**

1. **資料模型**: `category` 是 `Location` 模型的必填欄位
2. **前端發送**: 所有添加/編輯操作都會包含 category
3. **資料庫**: MongoDB 完整儲存 category 欄位
4. **讀取顯示**: 從資料庫讀取時會取得 category 並正確顯示

### 📊 資料完整性

```
Location 物件
├── id ✅
├── title ✅
├── category ✅ (美食/景點/住宿/購物/其他)
├── lat ✅
├── lng ✅
├── transportMode ✅
├── stayDuration ✅
├── description ✅ (可選)
└── ... (其他欄位)
```

所有欄位都會完整儲存到 MongoDB，包括 **category**！

---

## 補充資訊

### 類別欄位的重要性

1. **視覺區分** - 幫助用戶快速識別不同類型的活動
2. **用戶體驗** - 提供更好的資訊組織和瀏覽體驗  
3. **功能擴展** - 未來可以實現：
   - 按類別過濾行程
   - 統計分析（美食景點佔比等）
   - 智能推薦（缺少某類活動時提示）

### 數據一致性

- ✅ 前端編輯可以更改類別
- ✅ 更改會即時同步到資料庫
- ✅ 重新載入頁面後類別不會丟失
- ✅ 分享的行程也包含類別資訊
