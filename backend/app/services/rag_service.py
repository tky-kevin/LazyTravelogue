import os
import google.generativeai as genai
from typing import List, Dict
from app.database import get_database
from app.models import KnowledgeArticle

# Configure Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("LLM_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

EMBEDDING_MODEL = "models/text-embedding-004" # Newer model, check availability or use 'embedding-001'

async def get_embedding(text: str) -> List[float]:
    try:
        # Check if key is configured
        if not GOOGLE_API_KEY:
            print("Error: GOOGLE_API_KEY not set")
            return []
            
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text,
            task_type="retrieval_document",
            title="Travel Article Chunk"
        )
        return result['embedding']
    except Exception as e:
        print(f"Embedding failed: {e}")
        return []

async def index_document(url: str, title: str, chunks: List[str]):
    db = get_database()
    collection = db.knowledge_articles

    # Check if URL already indexed
    existing = await collection.find_one({"url": url})
    if existing:
        print(f"Skipping {url} - Already indexed.")
        return 

    docs_to_insert = []
    
    for chunk in chunks:
        vector = await get_embedding(chunk)
        if not vector:
            continue
            
        doc = KnowledgeArticle(
            url=url,
            title=title,
            content_chunk=chunk,
            embedding=vector
        )
        docs_to_insert.append(doc.model_dump(by_alias=True, exclude_none=True))
        
    if docs_to_insert:
        await collection.insert_many(docs_to_insert)
        print(f"Indexed {len(docs_to_insert)} chunks for {url}")

async def search_knowledge_base(query: str, limit: int = 5) -> List[Dict]:
    # 1. Embed Query
    if not GOOGLE_API_KEY:
        return []

    try:
        query_embedding = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=query,
            task_type="retrieval_query"
        )['embedding']
    except Exception as e:
        print(f"Query embedding failed: {e}")
        return []

    # 2. Vector Search via Aggregation Pipeline
    db = get_database()
    collection = db.knowledge_articles
    
    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index",
                "path": "embedding",
                "queryVector": query_embedding,
                "numCandidates": limit * 10,
                "limit": limit
            }
        },
        {
            "$project": {
                "_id": 0,
                "content_chunk": 1,
                "title": 1,
                "url": 1,
                "score": {"$meta": "vectorSearchScore"}
            }
        }
    ]
    
    results = []
    async for doc in collection.aggregate(pipeline):
        results.append({
            "content": doc['content_chunk'],
            "title": doc.get('title', 'Unknown Source'),
            "url": doc.get('url', '#')
        })
        
    return results
