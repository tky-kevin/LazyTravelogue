import requests
import asyncio
from bs4 import BeautifulSoup
from datetime import datetime
from app.services.rag_service import index_document
from app.database import get_database
from app.core.logging import logger

CRAWL_DELAY = 2  # Delay between requests (seconds)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

async def is_url_indexed(url: str) -> bool:
    """Check if URL exists in database"""
    db = get_database()
    existing = await db.knowledge_articles.find_one({"url": url})
    return existing is not None

async def crawl_and_index(url: str, max_pages: int = 10):
    try:
        if "sitemap" in url and url.endswith(".xml"):
            return await crawl_sitemap(url, max_pages)

        logger.info(f"Crawling {url}...")
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        title = soup.title.string.strip() if soup.title else url
        
        # Cleanup page structure
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'iframe', 'ads']):
            tag.decompose()

        # Custom logic for bunnyann.tw content selection
        content_area = soup.find('div', class_='entry-content') or soup.find('div', class_='post-content')
        if not content_area:
             content_area = soup.find('article')
        
        target = content_area if content_area else soup

        text = target.get_text(separator='\n', strip=True)
        
        chunk_size = 1500
        overlap = 200
        chunks = []
        
        current_pos = 0
        while current_pos < len(text):
            end_pos = min(current_pos + chunk_size, len(text))
            chunk = text[current_pos:end_pos]
            
            # Basic validation
            if len(chunk) > 100: 
                chunks.append(chunk)
                
            current_pos += (chunk_size - overlap)
                
        if chunks:
            await index_document(url, title, chunks)
            return True, f"Successfully indexed {len(chunks)} chunks from {title}"
        else:
            return False, "No valid content found to index"

    except Exception as e:
        logger.error(f"Crawler error for {url}: {e}")
        return False, str(e)

async def collect_urls_from_sitemap(sitemap_url: str) -> list:
    """Collect article URLs from sitemap index or list"""
    logger.info(f"Reading sitemap: {sitemap_url}")
    all_urls = []
    
    try:
        response = requests.get(sitemap_url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'xml')
        
        sitemaps = soup.find_all('sitemap')
        if sitemaps:
            logger.info(f"Found {len(sitemaps)} sub-sitemaps")
            for sm in sitemaps:
                loc = sm.find('loc').text
                if "post-sitemap" in loc:
                    logger.info(f"  → Processing sub-sitemap: {loc}")
                    sub_urls = await collect_urls_from_sitemap(loc)
                    all_urls.extend(sub_urls)
            return all_urls
        
        urls = soup.find_all('url')
        logger.info(f"Found {len(urls)} URLs in sitemap")
        
        for url_tag in urls:
            loc = url_tag.find('loc')
            lastmod = url_tag.find('lastmod')
            
            if loc and "bunnyann.tw" in loc.text:
                lastmod_date = None
                if lastmod and lastmod.text:
                    try:
                        # Try ISO format
                        lastmod_date = datetime.fromisoformat(lastmod.text.replace('Z', '+00:00'))
                    except:
                        try:
                            # Try other common formats
                            lastmod_date = datetime.strptime(lastmod.text[:10], '%Y-%m-%d')
                        except:
                            lastmod_date = datetime.min
                else:
                    lastmod_date = datetime.min
                    
                all_urls.append({
                    'url': loc.text,
                    'lastmod': lastmod_date
                })
                
        return all_urls
        
    except Exception as e:
        logger.error(f"Error reading sitemap {sitemap_url}: {e}")
        return []


async def crawl_sitemap(sitemap_url: str, max_pages: int = 10):
    """Crawl articles from sitemap, prioritizing newest"""
    try:
        logger.info(f"Sitemap Crawl Start (Max: {max_pages if max_pages > 0 else '∞'})")
        all_url_entries = await collect_urls_from_sitemap(sitemap_url)
        
        if not all_url_entries:
            return False, "No URLs found in sitemap"
        
        all_url_entries.sort(key=lambda x: x['lastmod'], reverse=True)
        logger.info(f"Total URLs collected: {len(all_url_entries)}")
        
        indexed_count = 0
        skipped_count = 0
        
        for entry in all_url_entries:
            url = entry['url']
            
            # Check if already indexed
            if await is_url_indexed(url):
                skipped_count += 1
                continue
            
            logger.info(f"[{indexed_count + 1}/{max_pages if max_pages > 0 else '∞'}] Crawling: {url}")
            success, msg = await crawl_and_index(url)
            
            if success:
                indexed_count += 1
            else:
                logger.warning(f"Failed to index {url}: {msg}")
            
            await asyncio.sleep(CRAWL_DELAY)
            
            if max_pages > 0 and indexed_count >= max_pages:
                break
        
        logger.info(f"Indexed {indexed_count}, Skipped {skipped_count}, Total {len(all_url_entries)}")
        return True, f"Success: {indexed_count} new, {skipped_count} skipped"
        
    except Exception as e:
        logger.error(f"Sitemap error: {e}")
        return False, str(e)
