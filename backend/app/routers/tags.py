from fastapi import APIRouter, Depends

from app.core.supabase import get_current_user
from app.services.bookmark import BookmarkService

router = APIRouter()


@router.get("", response_model=list[str])
async def list_tags(user: dict = Depends(get_current_user)):
    """Returns all unique tags used by the current user, sorted alphabetically."""
    return await BookmarkService.get_user_tags(user["id"])
