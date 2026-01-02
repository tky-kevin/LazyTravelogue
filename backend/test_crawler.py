import asyncio
import os
from dotenv import load_dotenv
from app.database import connect_to_mongo, close_mongo_connection
from app.services.crawler import crawl_and_index

load_dotenv()

async def test_crawler():
    await connect_to_mongo()
    
    test_url = "https://bunnyann.tw/post-sitemap.xml"
    
    print(f"Starting test crawl for: {test_url}")
    success, message = await crawl_and_index(test_url)
    
    print(f"Result: {success}")
    print(f"Message: {message}")
    
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(test_crawler())
