import requests
import asyncio
from bs4 import BeautifulSoup
from datetime import datetime
from app.services.rag_service import index_document
from app.database import get_database

# 爬蟲設定
CRAWL_DELAY = 2  # 每次爬取之間的延遲秒數，避免對目標網站造成負擔

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

async def is_url_indexed(url: str) -> bool:
    """檢查 URL 是否已經被索引過"""
    db = get_database()
    existing = await db.knowledge_articles.find_one({"url": url})
    return existing is not None

async def crawl_and_index(url: str, max_pages: int = 10):
    try:
        # Check if URL is a sitemap
        if "sitemap" in url and url.endswith(".xml"):
            return await crawl_sitemap(url, max_pages)

        print(f"Crawling {url}...")
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Metadata
        title = soup.title.string.strip() if soup.title else url
        
        # Cleanup distractions
        for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'iframe', 'ads']):
            tag.decompose()

        # Custom logic for bunnyann.tw: Try to find entry-content
        content_area = soup.find('div', class_='entry-content') or soup.find('div', class_='post-content')
        if not content_area:
             content_area = soup.find('article')
        
        # Fallback to body if no specific content area found
        target = content_area if content_area else soup

        # Get structured text
        text = target.get_text(separator='\n', strip=True)
        
        # Simple Chunking
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
        print(f"Crawler error: {e}")
        return False, str(e)

async def crawl_sitemap(sitemap_url: str, max_pages: int = 10):
    print(f"Reading sitemap: {sitemap_url} (Max new articles: {max_pages if max_pages > 0 else 'Unlimited'})")
    try:
        response = requests.get(sitemap_url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'xml')
        
        # Check for sitemap index
        sitemaps = soup.find_all('sitemap')
        if sitemaps:
            print(f"Found {len(sitemaps)} sub-sitemaps")
            total_indexed = 0
            for sm in sitemaps:
                loc = sm.find('loc').text
                if "post-sitemap" in loc:
                    # 傳遞剩餘需要爬取的數量
                    remaining = max_pages - total_indexed if max_pages > 0 else 0
                    if max_pages > 0 and remaining <= 0:
                        break
                    success, msg = await crawl_sitemap(loc, remaining if max_pages > 0 else 0)
                    # 從訊息中提取已索引數量
                    if "Indexed" in msg:
                        try:
                            indexed_count = int(msg.split()[1])
                            total_indexed += indexed_count
                        except:
                            pass
            return True, f"Processed sitemap index, indexed {total_indexed} new articles"
            
        urls = soup.find_all('url')
        print(f"Found {len(urls)} URLs in sitemap")
        
        # 解析 URL 和 lastmod，按日期排序（最新的優先）
        url_entries = []
        for url_tag in urls:
            loc = url_tag.find('loc')
            lastmod = url_tag.find('lastmod')
            
            if loc and "bunnyann.tw" in loc.text:
                lastmod_date = None
                if lastmod and lastmod.text:
                    try:
                        # 嘗試解析 ISO 格式日期
                        lastmod_date = datetime.fromisoformat(lastmod.text.replace('Z', '+00:00'))
                    except:
                        try:
                            # 嘗試其他常見格式
                            lastmod_date = datetime.strptime(lastmod.text[:10], '%Y-%m-%d')
                        except:
                            lastmod_date = datetime.min
                else:
                    lastmod_date = datetime.min
                    
                url_entries.append({
                    'url': loc.text,
                    'lastmod': lastmod_date
                })
        
        # 按 lastmod 排序，最新的在前面
        url_entries.sort(key=lambda x: x['lastmod'], reverse=True)
        print(f"Sorted {len(url_entries)} URLs by date (newest first)")
        
        # 爬取直到達到目標數量或全部完成
        indexed_count = 0
        skipped_count = 0
        
        for entry in url_entries:
            url = entry['url']
            
            # 檢查是否已經索引過
            if await is_url_indexed(url):
                skipped_count += 1
                continue
            
            # 爬取新文章
            print(f"[{indexed_count + 1}/{max_pages if max_pages > 0 else '∞'}] Crawling new article: {url}")
            success, msg = await crawl_and_index(url)
            
            if success:
                indexed_count += 1
                print(f"  ✓ {msg}")
            else:
                print(f"  ✗ Failed: {msg}")
            
            # 速度限制：每次爬取後暫停一段時間
            print(f"  💤 Waiting {CRAWL_DELAY}s before next request...")
            await asyncio.sleep(CRAWL_DELAY)
            
            # 檢查是否達到目標數量
            if max_pages > 0 and indexed_count >= max_pages:
                print(f"Reached target of {max_pages} new articles")
                break
        
        # 總結
        if indexed_count == 0 and skipped_count > 0:
            print(f"All {skipped_count} articles already indexed. Nothing new to crawl.")
            return True, f"Indexed 0 new articles (all {skipped_count} already indexed)"
        
        return True, f"Indexed {indexed_count} new articles (skipped {skipped_count} already indexed)"
        
    except Exception as e:
        print(f"Sitemap error: {e}")
        return False, str(e)
