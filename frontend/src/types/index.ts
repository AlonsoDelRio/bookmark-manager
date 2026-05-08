export interface Bookmark {
    id: string;
    user_id: string;
    url: string;
    title: string;
    favicon_url: string | null;
    is_read: boolean;
    tags: string[];
    created_at: string;
    updated_at: string;
}

export interface BookmarkListResponse {
    data: Bookmark[];
    total: number;
    page: number;
    page_size: number;
    has_more: boolean;
}

export interface BookmarkCreate {
    url: string;
    tags: string[];
}

export interface BookmarkUpdate {
    tags?: string[];
    is_read?: boolean;
}

export interface MetadataResponse {
    url: string;
    title: string;
    favicon_url: string | null;
    success: boolean;
    error: string | null;
}

export interface BookmarkFilters {
    tag?: string;
    search?: string;
    is_read?: boolean;
    page: number;
    page_size: number;
}
