import requests
import asyncio
from bs4 import BeautifulSoup
from datetime import datetime
from app.services.rag_service import index_document
from app.database import get_database

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
        # Check if URL is a sitemap
        if "sitemap" in url and url.endswith(".xml"):
            return await crawl_sitemap(url, max_pages)

        print(f"Crawling {url}...")
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
        print(f"Crawler error: {e}")
        return False, str(e)

async def collect_urls_from_sitemap(sitemap_url: str) -> list:
    """Collect all article URLs from sitemap (including sub-sitemaps)"""
    print(f"Reading sitemap: {sitemap_url}")
    all_urls = []
    
    try:
        response = requests.get(sitemap_url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'xml')
        
        # Check for sitemap index (contains <sitemap> tags)
        sitemaps = soup.find_all('sitemap')
        if sitemaps:
            print(f"Found {len(sitemaps)} sub-sitemaps")
            for sm in sitemaps:
                loc = sm.find('loc').text
                # Process only post-sitemaps
                if "post-sitemap" in loc:
                    print(f"  → Processing sub-sitemap: {loc}")
                    sub_urls = await collect_urls_from_sitemap(loc)
                    all_urls.extend(sub_urls)
            return all_urls
        
        # Regular sitemap with <url> tags
        urls = soup.find_all('url')
        print(f"  Found {len(urls)} URLs")
        
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
        print(f"Error reading sitemap {sitemap_url}: {e}")
        return []


async def crawl_sitemap(sitemap_url: str, max_pages: int = 10):
    """Crawl articles from sitemap, prioritizing newest"""
    print(f"="*60)
    print(f"Starting crawler (Max new articles: {max_pages if max_pages > 0 else 'Unlimited'})")
    print(f"="*60)
    
    try:
        # Phase 1: Collect URLs from all sitemaps
        print("\n[Phase 1] Collecting URLs from all sitemaps...")
        all_url_entries = await collect_urls_from_sitemap(sitemap_url)
        
        if not all_url_entries:
            return False, "No URLs found in sitemap"
        
        # Phase 2: Sort by date (newest first)
        all_url_entries.sort(key=lambda x: x['lastmod'], reverse=True)
        print(f"\n[Stats] Total URLs collected: {len(all_url_entries)}")
        print(f"   Newest: {all_url_entries[0]['lastmod']} - {all_url_entries[0]['url'][:60]}...")
        print(f"   Oldest: {all_url_entries[-1]['lastmod']} - {all_url_entries[-1]['url'][:60]}...")
        
        # Phase 3: Crawl new articles
        print(f"\n[Phase 2] Crawling new articles...")
        indexed_count = 0
        skipped_count = 0
        
        for entry in all_url_entries:
            url = entry['url']
            
            # Check if already indexed
            if await is_url_indexed(url):
                skipped_count += 1
                continue
            
            # 爬取新文章
            print(f"\n[{indexed_count + 1}/{max_pages if max_pages > 0 else '∞'}] Crawling: {url}")
            success, msg = await crawl_and_index(url)
            
            if success:
                indexed_count += 1
                print(f"  [OK] {msg}")
            else:
                print(f"  [FAIL] {msg}")
            
            # Rate limiting
            print(f"  [WAIT] {CRAWL_DELAY}s before next request...")
            await asyncio.sleep(CRAWL_DELAY)
            
            # 檢查是否達到目標數量
            if max_pages > 0 and indexed_count >= max_pages:
                print(f"\n[DONE] Reached target of {max_pages} new articles")
                break
        
        # 總結
        print(f"\n" + "="*60)
        print(f"SUMMARY")
        print(f"="*60)
        print(f"   New articles indexed: {indexed_count}")
        print(f"   Already indexed (skipped): {skipped_count}")
        print(f"   Total in sitemap: {len(all_url_entries)}")
        
        if indexed_count == 0 and skipped_count > 0:
            return True, f"Indexed 0 new articles (all {skipped_count} already indexed)"
        
        return True, f"Indexed {indexed_count} new articles (skipped {skipped_count} already indexed)"
        
    except Exception as e:
        print(f"Sitemap error: {e}")
        return False, str(e)
