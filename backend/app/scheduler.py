from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.crawler import crawl_and_index

scheduler = AsyncIOScheduler()

async def scheduled_crawl_job():
    print("Running scheduled crawler...")
    targets = [
        "https://bunnyann.tw/post-sitemap.xml"
    ] 
    for url in targets:
        try:
            await crawl_and_index(url)
        except Exception as e:
            print(f"Failed to crawl {url}: {e}")

def start_scheduler():
    if not scheduler.running:
        # Example: Run every 24 hours
        scheduler.add_job(scheduled_crawl_job, 'interval', hours=24)
        scheduler.start()
        print("Scheduler started.")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        print("Scheduler shutdown.")
