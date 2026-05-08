import { useState } from "react";
import { useBookmarks, useTags } from "@/hooks/useBookmarks";
import { useAuth } from "@/hooks/useAuth";
import { BookmarkCard } from "@/components/bookmarks/BookmarkCard";
import { AddBookmarkModal } from "@/components/bookmarks/AddBookmarkModal";
import { FilterBar } from "@/components/bookmarks/FilterBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import type { BookmarkFilters } from "@/types";
import styles from "./DashboardPage.module.css";

const PAGE_SIZE = 20;

export function DashboardPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<BookmarkFilters>({
    page: 1,
    page_size: PAGE_SIZE,
  });
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading, isFetching } = useBookmarks(filters);
  const { data: tags = [] } = useTags();

  const setFilter = <K extends keyof BookmarkFilters>(key: K, value: BookmarkFilters[K]) => {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  };

  const bookmarks = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className={styles.layout}>
      <Sidebar
        tags={tags}
        activeTag={filters.tag}
        onTagSelect={(tag) => setFilter("tag", tag)}
        onAddClick={() => setShowAdd(true)}
      />

      <main className={styles.main}>
        <Header
          onAddClick={() => setShowAdd(true)}
          user={user?.email ?? ""}
        />

        <div className={styles.content}>
          <FilterBar
            filters={filters}
            onSearch={(v) => setFilter("search", v || undefined)}
            onReadFilter={(v) => setFilter("is_read", v)}
            onClearTag={() => setFilter("tag", undefined)}
            isFetching={isFetching}
            total={total}
          />

          {isLoading ? (
            <div className={styles.skeletons}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.skeleton} />
              ))}
            </div>
          ) : bookmarks.length === 0 ? (
            <EmptyState hasFilters={!!(filters.tag || filters.search || filters.is_read !== undefined)} onAdd={() => setShowAdd(true)} />
          ) : (
            <>
              <div className={styles.grid}>
                {bookmarks.map((b) => (
                  <BookmarkCard key={b.id} bookmark={b} />
                ))}
              </div>

              {/* Pagination */}
              {total > PAGE_SIZE && (
                <div className={styles.pagination}>
                  <button
                    className={styles.pageBtn}
                    disabled={filters.page === 1}
                    onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                  >
                    ← Previous
                  </button>
                  <span className={styles.pageInfo}>
                    Page {filters.page} of {Math.ceil(total / PAGE_SIZE)}
                  </span>
                  <button
                    className={styles.pageBtn}
                    disabled={!data?.has_more}
                    onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {showAdd && <AddBookmarkModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function EmptyState({ hasFilters, onAdd }: { hasFilters: boolean; onAdd: () => void }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>🔖</div>
      <h3 className={styles.emptyTitle}>
        {hasFilters ? "No bookmarks match your filters" : "Your collection is empty"}
      </h3>
      <p className={styles.emptyText}>
        {hasFilters
          ? "Try adjusting your search or filters."
          : "Start saving URLs to build your personal library."}
      </p>
      {!hasFilters && (
        <button className={styles.emptyBtn} onClick={onAdd}>
          Add your first bookmark
        </button>
      )}
    </div>
  );
}
