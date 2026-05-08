import builtins
import logging
from typing import Any

from app.core.supabase import supabase

logger = logging.getLogger(__name__)


class BookmarkService:

    @staticmethod
    async def create(
        user_id: str,
        url: str,
        title: str,
        favicon_url: str | None,
        tags: list[str],
    ) -> dict[str, Any]:
        data = {
            "user_id": user_id,
            "url": url,
            "title": title,
            "favicon_url": favicon_url,
            "tags": tags,
            "is_read": False,
        }
        result = supabase.table("bookmarks").insert(data).execute()
        return result.data[0]

    @staticmethod
    async def list(
        user_id: str,
        page: int = 1,
        page_size: int = 10,
        tag: str | None = None,
        search: str | None = None,
        is_read: bool | None = None,
    ) -> tuple[list[dict[str, Any]], int]:
        query = supabase.table("bookmarks").select("*", count="exact").eq("user_id", user_id)

        if tag:
            query = query.contains("tags", [tag])
        if search:
            query = query.or_(f"title.ilike.%{search}%,url.ilike.%{search}%")
        if is_read is not None:
            query = query.eq("is_read", is_read)

        offset = (page - 1) * page_size
        query = query.order("created_at", desc=True).range(offset, offset + page_size - 1)

        result = query.execute()
        total = result.count or 0
        return result.data, total

    @staticmethod
    async def get_by_id(bookmark_id: str, user_id: str) -> dict[str, Any] | None:
        result = (
            supabase.table("bookmarks")
            .select("*")
            .eq("id", bookmark_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
        return result.data

    @staticmethod
    async def update(
        bookmark_id: str,
        user_id: str,
        updates: dict[str, Any],
    ) -> dict[str, Any] | None:
        result = (
            supabase.table("bookmarks")
            .update(updates)
            .eq("id", bookmark_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not result.data:
            return None
        return result.data[0]

    @staticmethod
    async def delete(bookmark_id: str, user_id: str) -> bool:
        result = (
            supabase.table("bookmarks")
            .delete()
            .eq("id", bookmark_id)
            .eq("user_id", user_id)
            .execute()
        )
        return len(result.data) > 0

    @staticmethod
    async def get_user_tags(user_id: str) -> builtins.list[str]:
        result = (
            supabase.table("bookmarks")
            .select("tags")
            .eq("user_id", user_id)
            .execute()
        )
        all_tags: set[str] = set()
        for row in result.data:
            all_tags.update(row.get("tags") or [])
        return sorted(all_tags)
