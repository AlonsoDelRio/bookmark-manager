from pydantic import BaseModel, field_validator


class MetadataResponse(BaseModel):
    url: str
    title: str
    favicon_url: str | None = None
    success: bool
    error: str | None = None

class BookmarkCreate(BaseModel):
    url: str
    tags: list[str] = []

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, v):
        cleaned = [t.strip().lower() for t in v if t.strip()]
        if len(cleaned) > 10:
            raise ValueError("Maximum 10 tags per bookmark")
        return list(dict.fromkeys(cleaned))

class BookmarkUpdate(BaseModel):
    tags: Optional[List[str]] = None
    is_read: Optional[bool] = None


