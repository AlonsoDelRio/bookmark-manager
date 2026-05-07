
from pydantic import BaseModel


class MetadataResponse(BaseModel):
    url: str
    title: str
    favicon_url: str | None = None
    success: bool
    error: str | None = None
