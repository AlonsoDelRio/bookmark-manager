
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.config import settings
from app.core.supabase import get_current_user
from app.schemas.bookmark import (
    BookmarkCreate,
    BookmarkListResponse,
    BookmarkResponse,
    BookmarkUpdate,
)
from app.services.bookmark import BookmarkService
from app.services.metadata import fetch_metadata

router = APIRouter()


@router.post("", response_model=BookmarkResponse, status_code=status.HTTP_201_CREATED)
async def create_bookmark(
    payload: BookmarkCreate,
    user: dict = Depends(get_current_user),
):
    title, favicon_url, success, error = await fetch_metadata(
        payload.url, timeout=settings.METADATA_FETCH_TIMEOUT
    )
    # We always save the bookmark regardless of metadata extraction success
    bookmark = await BookmarkService.create(
        user_id=user["id"],
        url=payload.url,
        title=title,
        favicon_url=favicon_url,
        tags=payload.tags,
    )
    return bookmark


@router.get("", response_model=BookmarkListResponse)
async def list_bookmarks(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=20),
    tag: str | None = Query(default=None),
    search: str | None = Query(default=None),
    is_read: bool | None = Query(default=None),
    user: dict = Depends(get_current_user),
):
    data, total = await BookmarkService.list(
        user_id=user["id"],
        page=page,
        page_size=page_size,
        tag=tag,
        search=search,
        is_read=is_read,
    )
    return BookmarkListResponse(
        data=data,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/{bookmark_id}", response_model=BookmarkResponse)
async def get_bookmark(
    bookmark_id: str,
    user: dict = Depends(get_current_user),
):
    bookmark = await BookmarkService.get_by_id(bookmark_id, user["id"])
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return bookmark


@router.patch("/{bookmark_id}", response_model=BookmarkResponse)
async def update_bookmark(
    bookmark_id: str,
    payload: BookmarkUpdate,
    user: dict = Depends(get_current_user),
):
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    bookmark = await BookmarkService.update(bookmark_id, user["id"], updates)
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return bookmark


@router.delete("/{bookmark_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bookmark(
    bookmark_id: str,
    user: dict = Depends(get_current_user),
):
    deleted = await BookmarkService.delete(bookmark_id, user["id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Bookmark not found")
