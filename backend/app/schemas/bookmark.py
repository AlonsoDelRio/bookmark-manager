from datetime import datetime

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
    tags: list[str] | None = None
    is_read: bool | None = None

class BookmarkResponse(BaseModel):
    id: str
    user_id: str
    url: str
    title: str
    favicon_url: str | None = None
    is_read: bool
    tags: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BookmarkListResponse(BaseModel):
    data: list[BookmarkResponse]
    total: int
    page: int
    page_size: int
    has_more: bool
