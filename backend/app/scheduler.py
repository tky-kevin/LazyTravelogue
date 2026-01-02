from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.crawler import crawl_and_index
from app.core.logging import logger

scheduler = AsyncIOScheduler()

async def scheduled_crawl_job():
    logger.info("Running scheduled crawler...")
    targets = [
        "https://bunnyann.tw/post-sitemap.xml"
    ] 
    for url in targets:
        try:
            await crawl_and_index(url)
        except Exception as e:
            logger.error(f"Scheduled crawl failed for {url}: {e}")

def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(scheduled_crawl_job, 'interval', hours=24)
        scheduler.start()
        logger.info("Scheduler started.")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shutdown.")
