from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.logging import logger

class Database:
    client: AsyncIOMotorClient = None


db = Database()


async def connect_to_mongo():
    mongo_uri = settings.MONGODB_URI
    if not mongo_uri:
        logger.warning("MONGODB_URI not set in environment")
        return

    db.client = AsyncIOMotorClient(mongo_uri)
    logger.info("Connected to MongoDB")


async def close_mongo_connection():
    if db.client:
        db.client.close()
        logger.info("Closed MongoDB connection")


def get_database():
    return db.client.get_database(settings.DATABASE_NAME)
