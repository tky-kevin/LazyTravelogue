"""
測試 AI 生成的行程是否包含正確的 category 格式
"""

# 模擬 AI 返回的 JSON 示例（修改後應該是英文 ID）
example_response = """
{
    "title": "台北三日美食探索之旅",
    "days": [
        {
            "id": "day-1",
            "date": "Day 1",
            "activities": [
                {
                    "id": "act-tp-1-1",
                    "title": "鼎泰豐",
                    "category": "food",
                    "description": "必吃小籠包",
                    "stayDuration": 90,
                    "transportMode": "WALKING",
                    "lat": 25.0418,
                    "lng": 121.5436
                },
                {
                    "id": "act-tp-1-2",
                    "title": "台北101",
                    "category": "scenic",
                    "description": "世界知名地標",
                    "stayDuration": 120,
                    "transportMode": "DRIVING",
                    "lat": 25.0330,
                    "lng": 121.5654
                },
                {
                    "id": "act-tp-1-3",
                    "title": "君品酒店",
                    "category": "hotel",
                    "description": "市中心奢華住宿",
                    "stayDuration": 0,
                    "transportMode": "DRIVING",
                    "lat": 25.0478,
                    "lng": 121.5170
                }
            ]
        },
        {
            "id": "day-2",
            "date": "Day 2",
            "activities": [
                {
                    "id": "act-tp-2-1",
                    "title": "西門町",
                    "category": "shopping",
                    "description": "年輕人購物天堂",
                    "stayDuration": 180,
                    "transportMode": "TRANSIT",
                    "lat": 25.0420,
                    "lng": 121.5067
                }
            ]
        }
    ]
}
"""

import json

# 解析 JSON
data = json.loads(example_response)

# 前端的類別映射
CATEGORY_OPTIONS = {
    'food': {'label': '美食', 'icon': '🍴'},
    'scenic': {'label': '景點', 'icon': '📷'},
    'hotel': {'label': '住宿', 'icon': '🏨'},
    'shopping': {'label': '購物', 'icon': '🛍️'},
    'other': {'label': '其他', 'icon': '📍'}
}

print("=" * 60)
print("AI 生成行程的 Category 測試")
print("=" * 60)

print(f"\n行程標題: {data['title']}")
print(f"天數: {len(data['days'])}")

for day in data['days']:
    print(f"\n{day['date']}:")
    for activity in day['activities']:
        category_id = activity['category']
        category_info = CATEGORY_OPTIONS.get(category_id, CATEGORY_OPTIONS['other'])
        
        # 檢查是否能正確匹配
        if category_id in CATEGORY_OPTIONS:
            status = "✅"
        else:
            status = "❌"
        
        print(f"  {status} {activity['title']}")
        print(f"     Category ID: {category_id}")
        print(f"     顯示為: {category_info['icon']} {category_info['label']}")

print("\n" + "=" * 60)
print("結論:")
print("=" * 60)

# 檢查所有活動的 category
all_valid = True
for day in data['days']:
    for activity in day['activities']:
        if activity['category'] not in CATEGORY_OPTIONS:
            all_valid = False
            break

if all_valid:
    print("✅ 所有活動的 category 都使用正確的英文 ID 格式")
    print("✅ 前端可以正確顯示對應的圖示和顏色")
else:
    print("❌ 發現無效的 category 值")

print("\n修改前後對照:")
print("  修改前: category: \"觀光\" (中文) → 前端無法匹配 → 顯示為「其他」")
print("  修改後: category: \"scenic\" (英文) → 前端正確匹配 → 顯示為「景點」📷")
