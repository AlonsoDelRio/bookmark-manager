import logging
import re
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; BookmarkBot/1.0)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def extract_domain(url: str) -> str:
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.replace("www.", "")
        return domain or url
    except Exception:
        return url


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

            soup = BeautifulSoup(response.text, "html.parser")

            title = None
            title_tag = soup.find("title")
            if title_tag and title_tag.string:
                title = clean_title(title_tag.string)

            return (title or fallback_title, None, True, None)

    except httpx.TimeoutException:
        logger.warning(f"Timeout fetching metadata for {url}")
        return (fallback_title, None, False, "Request timed out")
    except httpx.RequestError as e:
        logger.error(f"Request error for {url}: {e}")
        return (fallback_title, None, False, str(e))
    except Exception as e:
        logger.error(f"Unexpected error fetching {url}: {e}")
        return (fallback_title, None, False, str(e))
