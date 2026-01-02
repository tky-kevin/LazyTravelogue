import google.generativeai as genai
from typing import List, Dict
from app.database import get_database
from app.models import KnowledgeArticle
from app.core.config import settings
from app.core.logging import logger

# Gemini Config
GOOGLE_API_KEY = settings.LLM_API_KEY
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

EMBEDDING_MODEL = "models/text-embedding-004"

async def get_embedding(text: str) -> List[float]:
    try:
        if not GOOGLE_API_KEY:
            logger.error("GOOGLE_API_KEY not set")
            return []
            
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text,
            task_type="retrieval_document",
            title="Travel Article Chunk"
        )
        return result['embedding']
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        return []

async def index_document(url: str, title: str, chunks: List[str]):
    db = get_database()
    collection = db.knowledge_articles

    existing = await collection.find_one({"url": url})
    if existing:
        return 

    docs_to_insert = []
    for chunk in chunks:
        vector = await get_embedding(chunk)
        if not vector:
            continue
            
        doc = KnowledgeArticle(url=url, title=title, content_chunk=chunk, embedding=vector)
        docs_to_insert.append(doc.model_dump(by_alias=True, exclude_none=True))
        
    if docs_to_insert:
        await collection.insert_many(docs_to_insert)
        logger.info(f"Indexed {len(docs_to_insert)} chunks for {url}")

async def search_knowledge_base(query: str, limit: int = 5) -> List[Dict]:
    if not GOOGLE_API_KEY:
        return []

    try:
        query_embedding = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=query,
            task_type="retrieval_query"
        )['embedding']
    except Exception as e:
        logger.error(f"Query embedding failed: {e}")
        return []

    db = get_database()
    collection = db.knowledge_articles
    
    # Atlas Vector Search pipeline
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
