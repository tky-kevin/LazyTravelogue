"""
檢查資料庫中是否有儲存 category 欄位
"""
import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# 載入環境變數
load_dotenv('backend/.env')

async def check_category_storage():
    # 連接資料庫
    mongodb_uri = os.getenv("MONGODB_URI")
    client = AsyncIOMotorClient(mongodb_uri)
    db = client.get_database("travelogue")
    
    # 查詢一個行程範例
    itinerary = await db.itineraries.find_one({})
    
    if itinerary:
        print("=" * 60)
        print("資料庫中的行程範例：")
        print("=" * 60)
        print(f"標題: {itinerary.get('title')}")
        print(f"\n天數: {len(itinerary.get('days', []))}")
        
        if itinerary.get('days'):
            first_day = itinerary['days'][0]
            print(f"\n第一天日期: {first_day.get('date')}")
            print(f"活動數量: {len(first_day.get('activities', []))}")
            
            if first_day.get('activities'):
                print("\n" + "=" * 60)
                print("前 3 個活動的詳細資訊：")
                print("=" * 60)
                
                for i, activity in enumerate(first_day['activities'][:3], 1):
                    print(f"\n活動 {i}:")
                    print(f"  ID: {activity.get('id')}")
                    print(f"  標題: {activity.get('title')}")
                    print(f"  類別 (category): {activity.get('category', '❌ 未找到')}")
                    print(f"  座標: ({activity.get('lat')}, {activity.get('lng')})")
                    print(f"  交通方式: {activity.get('transportMode')}")
                    print(f"  停留時間: {activity.get('stayDuration')} 分鐘")
                    if activity.get('description'):
                        print(f"  描述: {activity.get('description')}")
                    
                    # 列出所有可用欄位
                    print(f"  所有欄位: {list(activity.keys())}")
        
        print("\n" + "=" * 60)
        print("結論：")
        print("=" * 60)
        
        # 檢查是否有 category 欄位
        has_category = False
        if itinerary.get('days'):
            for day in itinerary['days']:
                for activity in day.get('activities', []):
                    if 'category' in activity:
                        has_category = True
                        break
                if has_category:
                    break
        
        if has_category:
            print("✅ 資料庫中「有」儲存 category 欄位")
        else:
            print("❌ 資料庫中「沒有」儲存 category 欄位")
    else:
        print("❌ 資料庫中沒有找到任何行程")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_category_storage())
