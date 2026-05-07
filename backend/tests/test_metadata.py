
from app.services.metadata import clean_title, extract_domain

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
