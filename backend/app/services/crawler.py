import requests
from bs4 import BeautifulSoup
from app.services.rag_service import index_document

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

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
    print(f"Reading sitemap: {sitemap_url} (Max: {max_pages})")
    try:
        response = requests.get(sitemap_url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'xml')
        
        # Check for sitemap index
        sitemaps = soup.find_all('sitemap')
        if sitemaps:
            print(f"Found {len(sitemaps)} sub-sitemaps")
            for sm in sitemaps:
                loc = sm.find('loc').text
                if "post-sitemap" in loc:
                    await crawl_sitemap(loc, max_pages)
            return True, "Processed sitemap index"
            
        urls = soup.find_all('url')
        print(f"Found {len(urls)} URLs in sitemap")
        
        count = 0
        target_urls = urls[:max_pages] if max_pages > 0 else urls

        for url_tag in target_urls:
            loc = url_tag.find('loc').text
            if "bunnyann.tw" in loc:
                await crawl_and_index(loc)
                count += 1
                
        return True, f"Indexed {count} pages from sitemap"
    except Exception as e:
        print(f"Sitemap error: {e}")
        return False, str(e)
