import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

class Database:
    client: AsyncIOMotorClient = None

db = Database()

async def connect_to_mongo():
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri:
        print("WARNING: MONGODB_URI not set in .env")
        return

    db.client = AsyncIOMotorClient(mongo_uri)
    print("Connected to MongoDB")

async def close_mongo_connection():
    if db.client:
        db.client.close()
        print("Closed MongoDB connection")

def get_database():
    return db.client.get_database("lazytravelogue")  # Default DB name
