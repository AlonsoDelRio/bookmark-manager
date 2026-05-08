import { supabase } from "./supabase";
import type {
    Bookmark,
    BookmarkCreate,
    BookmarkFilters,
    BookmarkListResponse,
    BookmarkUpdate,
    MetadataResponse,
} from "@/types";

const API_BASE = import.meta.env["VITE_API_URL"] ?? "";

async function getAuthHeaders(): Promise<Record<string, string>> {
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
        throw new Error("Not authenticated");
    }
    return {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
    };
}

async function apiFetch<T>(
    path: string,
    options?: RequestInit
): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api${path}`, {
        ...options,
        headers: { ...headers, ...options?.headers },
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(body.detail ?? `HTTP ${res.status}`);
    }

    if (res.status === 204) {
        return undefined as T;
    }
    return res.json() as Promise<T>;
}

export async function fetchBookmarks(
    filters: BookmarkFilters
): Promise<BookmarkListResponse> {
    const params = new URLSearchParams();
    params.set("page", String(filters.page));
    params.set("page_size", String(filters.page_size));
    if (filters.tag) params.set("tag", filters.tag);
    if (filters.search) params.set("search", filters.search);
    if (filters.is_read !== undefined)
        params.set("is_read", String(filters.is_read));

    return apiFetch<BookmarkListResponse>(`/bookmarks?${params.toString()}`);
}

export async function createBookmark(
    payload: BookmarkCreate
): Promise<Bookmark> {
    return apiFetch<Bookmark>("/bookmarks", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function updateBookmark(
    id: string,
    payload: BookmarkUpdate
): Promise<Bookmark> {
    return apiFetch<Bookmark>(`/bookmarks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
}

export async function deleteBookmark(id: string): Promise<void> {
    return apiFetch<void>(`/bookmarks/${id}`, { method: "DELETE" });
}

export async function previewMetadata(url: string): Promise<MetadataResponse> {
    return apiFetch<MetadataResponse>(
        `/metadata/preview?url=${encodeURIComponent(url)}`
    );
}

export async function fetchTags(): Promise<string[]> {
    return apiFetch<string[]>("/tags");
}