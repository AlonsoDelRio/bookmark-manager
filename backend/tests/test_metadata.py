from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from bs4 import BeautifulSoup

from app.services.metadata import clean_title, extract_domain, extract_favicon_url, fetch_metadata

# ---------------------------------------------------------------------------
# Unit tests: pure helper functions
# ---------------------------------------------------------------------------

def test_extract_domain_simple():
    assert extract_domain("https://www.github.com/user/repo") == "github.com"


def test_extract_domain_no_www():
    assert extract_domain("https://example.com/path") == "example.com"


def test_extract_domain_invalid_url():
    result = extract_domain("not-a-url")
    assert result == "not-a-url"


def test_clean_title_strips_whitespace():
    assert clean_title("  Hello   World  ") == "Hello World"


def test_clean_title_normalizes_newlines():
    assert clean_title("Title\n  with\t  tabs") == "Title with tabs"

def test_extract_favicon_from_link_tag():
    html = '<html><head><link rel="icon" href="/favicon.png"></head></html>'
    soup = BeautifulSoup(html, "html.parser")
    result = extract_favicon_url(soup, "https://example.com")
    assert result == "https://example.com/favicon.png"


def test_extract_favicon_fallback():
    html = "<html><head></head></html>"
    soup = BeautifulSoup(html, "html.parser")
    result = extract_favicon_url(soup, "https://example.com/page")
    assert result == "https://example.com/favicon.ico"


def _mock_response(html: str, status_code: int = 200, url: str = "https://github.com"):
    mock = MagicMock()
    mock.status_code = status_code
    mock.text = html
    mock.headers = {"content-type": "text/html; charset=utf-8"}
    mock.url = url
    return mock


HTML_WITH_TITLE = """
<html>
<head>
    <title>  GitHub: Let's build from here  </title>
    <link rel="icon" href="/favicon.ico">
</head>
<body></body>
</html>
"""
@pytest.mark.asyncio
async def test_fetch_metadata_success():
    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=_mock_response(HTML_WITH_TITLE))
        mock_client_cls.return_value = mock_client

        title, favicon, success, error = await fetch_metadata("https://github.com")

        assert success is True
        assert title == "GitHub: Let's build from here"
        assert favicon is not None
        assert error is None


HTML_OG_TITLE = """
<html>
<head>
    <meta property="og:title" content="Open Graph Title">
</head>
</html>
"""
@pytest.mark.asyncio
async def test_fetch_metadata_uses_og_title_when_no_title_tag():
    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=_mock_response(HTML_OG_TITLE))
        mock_client_cls.return_value = mock_client

        title, favicon, success, error = await fetch_metadata("https://example.com")

        assert success is True
        assert title == "Open Graph Title"


HTML_NO_TITLE = """<html><head></head><body><h1>Hello</h1></body></html>"""
@pytest.mark.asyncio
async def test_fetch_metadata_no_title_falls_back_to_domain():
    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=_mock_response(HTML_NO_TITLE))
        mock_client_cls.return_value = mock_client

        title, favicon, success, error = await fetch_metadata("https://example.com")

        assert success is True
        assert title == "example.com"


@pytest.mark.asyncio
async def test_fetch_metadata_http_error_falls_back_to_domain():
    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=_mock_response("", status_code=404))
        mock_client_cls.return_value = mock_client

        title, favicon, success, error = await fetch_metadata("https://example.com/missing")

        assert success is False
        assert title == "example.com"
        assert "404" in error


@pytest.mark.asyncio
async def test_fetch_metadata_timeout_falls_back():
    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(side_effect=httpx.TimeoutException("timed out"))
        mock_client_cls.return_value = mock_client

        title, favicon, success, error = await fetch_metadata("https://slow-site.com")

        assert success is False
        assert title == "slow-site.com"
        assert error == "Request timed out"


@pytest.mark.asyncio
async def test_fetch_metadata_connection_error_falls_back():
    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(
            side_effect=httpx.ConnectError("Connection refused")
        )
        mock_client_cls.return_value = mock_client

        title, favicon, success, error = await fetch_metadata("https://unreachable.xyz")

        assert success is False
        assert title == "unreachable.xyz"
        assert error is not None


@pytest.mark.asyncio
async def test_fetch_metadata_non_html_content():
    with patch("httpx.AsyncClient") as mock_client_cls:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_resp = _mock_response("", status_code=200)
        mock_resp.headers = {"content-type": "application/pdf"}
        mock_client.get = AsyncMock(return_value=mock_resp)
        mock_client_cls.return_value = mock_client

        title, favicon, success, error = await fetch_metadata("https://example.com/doc.pdf")

        assert success is False
        assert "Non-HTML" in error
