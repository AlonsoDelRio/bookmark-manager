from fastapi import APIRouter, Depends, Query

from app.core.config import settings
from app.core.supabase import get_current_user
from app.schemas.bookmark import MetadataResponse
from app.services.metadata import fetch_metadata

router = APIRouter()


@router.get("/preview", response_model=MetadataResponse)
async def preview_metadata(
    url: str = Query(..., description="URL to extract metadata from"),
    user: dict = Depends(get_current_user),
):
    title, favicon_url, success, error = await fetch_metadata(
        url, timeout=settings.METADATA_FETCH_TIMEOUT
    )
    return MetadataResponse(
        url=url, title=title, favicon_url=favicon_url,
        success=success, error=error,
    )
