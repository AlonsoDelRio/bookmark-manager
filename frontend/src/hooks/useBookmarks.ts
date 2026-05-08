import {
    useQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
    fetchBookmarks,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    fetchTags,
} from "@/lib/api";
import type { BookmarkFilters, BookmarkListResponse, BookmarkUpdate } from "@/types";

// ── Keys ──────────────────────────────────────────────────────────────────────

export const bookmarkKeys = {
    all: ["bookmarks"] as const,
    list: (filters: BookmarkFilters) => ["bookmarks", "list", filters] as const,
    tags: ["tags"] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function useBookmarks(filters: BookmarkFilters) {
    return useQuery({
        queryKey: bookmarkKeys.list(filters),
        queryFn: () => fetchBookmarks(filters),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
    });
}

export function useTags() {
    return useQuery({
        queryKey: bookmarkKeys.tags,
        queryFn: fetchTags,
        staleTime: 60_000,
    });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateBookmark() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: createBookmark,
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: bookmarkKeys.all });
            void qc.invalidateQueries({ queryKey: bookmarkKeys.tags });
            toast.success("Bookmark saved!");
        },
        onError: (err: Error) => {
            toast.error(err.message ?? "Failed to save bookmark");
        },
    });
}

export function useToggleRead() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, is_read }: { id: string; is_read: boolean }) =>
            updateBookmark(id, { is_read }),

        // Optimistic update
        onMutate: async ({ id, is_read }) => {
            await qc.cancelQueries({ queryKey: bookmarkKeys.all });
            const snapshots = qc.getQueriesData<BookmarkListResponse>({
                queryKey: bookmarkKeys.all,
            });

            qc.setQueriesData<BookmarkListResponse>(
                { queryKey: bookmarkKeys.all },
                (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        data: old.data.map((b) =>
                            b.id === id ? { ...b, is_read } : b
                        ),
                    };
                }
            );

            return { snapshots };
        },

        onError: (_err, _vars, context) => {
            if (context?.snapshots) {
                context.snapshots.forEach(([key, data]) => {
                    qc.setQueryData(key, data);
                });
            }
            toast.error("Failed to update bookmark");
        },

        onSettled: () => {
            void qc.invalidateQueries({ queryKey: bookmarkKeys.all });
        },
    });
}

export function useUpdateBookmark() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...payload }: { id: string } & BookmarkUpdate) =>
            updateBookmark(id, payload),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: bookmarkKeys.all });
            void qc.invalidateQueries({ queryKey: bookmarkKeys.tags });
            toast.success("Bookmark updated");
        },
        onError: (err: Error) => {
            toast.error(err.message ?? "Failed to update");
        },
    });
}

export function useDeleteBookmark() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: deleteBookmark,
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: bookmarkKeys.all });
            toast.success("Bookmark deleted");
        },
        onError: () => {
            toast.error("Failed to delete bookmark");
        },
    });
}
