import logging
import re
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; BookmarkBot/1.0 +https://github.com/bookmarks)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def extract_domain(url: str) -> str:
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.replace("www.", "")
        return domain or url
    except Exception:
        return url

def extract_favicon_url(soup: BeautifulSoup, base_url: str) -> str | None:
    # 1. <link rel="icon"> or rel="shortcut icon"
    for rel_name in ["icon", "shortcut icon", "apple-touch-icon"]:
        rel_val = rel_name 
        tag = soup.find("link", rel=lambda r, rv=rel_val: bool(r) and rv in r.lower())
        if tag and tag.get("href"):
            return urljoin(base_url, tag["href"])

    # 2. Fallback to /favicon.ico
    parsed = urlparse(base_url)
    return f"{parsed.scheme}://{parsed.netloc}/favicon.ico"


def clean_title(title: str) -> str:
    return re.sub(r"\s+", " ", title).strip()


async def fetch_metadata(
    url: str, timeout: int = 10
) -> tuple[str, str | None, bool, str | None]:
    fallback_title = extract_domain(url)

    try:
        async with httpx.AsyncClient(
            follow_redirects=True, timeout=timeout, headers=HEADERS
        ) as client:
            response = await client.get(url)

            if response.status_code >= 400:
                logger.warning(f"HTTP {response.status_code} for {url}")
                return (fallback_title, None, False, f"HTTP {response.status_code}")

            content_type = response.headers.get("content-type", "")
            if "text/html" not in content_type and "application/xhtml" not in content_type:
                return (fallback_title, None, False, f"Non-HTML content: {content_type}")

            soup = BeautifulSoup(response.text, "html.parser")

            title = None
            title_tag = soup.find("title")
            if title_tag and title_tag.string:
                title = clean_title(title_tag.string)
            
            if not title:
                og_title = soup.find("meta", property="og:title")
                if og_title and og_title.get("content"):
                    title = clean_title(og_title["content"])
            
            if not title:
                tw_title = soup.find("meta", attrs={"name": "twitter:title"})
                if tw_title and tw_title.get("content"):
                    title = clean_title(tw_title["content"])

            title = title or fallback_title
            favicon_url = extract_favicon_url(soup, str(response.url))

            return (title, favicon_url, True, None)

    except httpx.TimeoutException:
        logger.warning(f"Timeout fetching metadata for {url}")
        return (fallback_title, None, False, "Request timed out")
    except httpx.RequestError as e:
        logger.error(f"Request error for {url}: {e}")
        return (fallback_title, None, False, str(e))
    except Exception as e:
        logger.error(f"Unexpected error fetching {url}: {e}")
        return (fallback_title, None, False, str(e))
