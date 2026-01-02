import asyncio
import argparse
from dotenv import load_dotenv
from app.database import connect_to_mongo, close_mongo_connection, get_database
from app.services.crawler import crawl_and_index

load_dotenv()

async def run_crawler(url: str, clean: bool, max_pages: int):
    print("Connecting to MongoDB...")
    await connect_to_mongo()
    
    if clean:
        print("Cleaning knowledge base...")
        db = get_database()
        result = await db["knowledge_articles"].delete_many({})
        print(f"Deleted {result.deleted_count} documents.")
    
    print(f"Starting crawl for: {url}")
    print(f"Max pages per sitemap: {max_pages if max_pages > 0 else 'Unlimited'}")
    
    success, message = await crawl_and_index(url, max_pages=max_pages)
    
    print(f"Crawl finished.")
    print(f"Success: {success}")
    print(f"Message: {message}")
    
    await close_mongo_connection()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Manual Crawler Trigger")
    parser.add_argument("--url", type=str, default="https://bunnyann.tw/sitemap.xml", help="The URL or Sitemap to crawl")
    parser.add_argument("--max", type=int, default=10, help="Max pages to crawl per sitemap. Set to 0 for unlimited.")
    parser.add_argument("--clean", action="store_true", help="Clean the knowledge base before crawling")
    
    args = parser.parse_args()
    
    asyncio.run(run_crawler(args.url, args.clean, args.max))
