import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

async def create_index():
    uri = os.getenv("MONGODB_URI")
    if not uri:
        print("Please set MONGODB_URI in .env")
        return

    client = AsyncIOMotorClient(uri)
    db = client.get_database("lazytravelogue") # Ensure this matches your DB name
    collection = db.knowledge_articles
    
    # Definition for Atlas Vector Search
    # Using dimensions=768 for Gemini embeddings (text-embedding-004)
    model = {
        "definition": {
            "fields": [
                {
                    "type": "vector",
                    "path": "embedding",
                    "numDimensions": 768, 
                    "similarity": "cosine"
                }
            ]
        },
        "name": "vector_index",
        "type": "vectorSearch"
    }

    print("Creating Atlas Vector Search Index 'vector_index'...")
    try:
        # Note: create_search_index is available in pymongo>=4.7 / motor equivalent
        # If this fails, the user might need to use the Atlas UI.
        await collection.create_search_index(model=model)
        print("Index creation initiated. It may take some time to build on Atlas.")
    except Exception as e:
        print(f"Error creating index (You might need to create it manually in Atlas UI): {e}")
    finally:
        client.close()
    
if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    loop.run_until_complete(create_index())
