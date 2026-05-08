import { Search, X, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import type { BookmarkFilters } from "@/types";
import styles from "./FilterBar.module.css";

interface Props {
  filters: BookmarkFilters;
  onSearch: (value: string) => void;
  onReadFilter: (value: boolean | undefined) => void;
  onClearTag: () => void;
  isFetching: boolean;
  total: number;
}

export function FilterBar({ filters, onSearch, onReadFilter, onClearTag, isFetching, total }: Props) {
  const [searchValue, setSearchValue] = useState(filters.search ?? "");

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setSearchValue(v);
      onSearch(v);
    },
    [onSearch]
  );

  const readOptions: Array<{ label: string; value: boolean | undefined }> = [
    { label: "All", value: undefined },
    { label: "Unread", value: false },
    { label: "Read", value: true },
  ];

  return (
    <div className={styles.bar}>
      <div className={styles.row}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.search}
            type="text"
            placeholder="Search bookmarks…"
            value={searchValue}
            onChange={handleSearch}
          />
          {isFetching && <Loader2 size={14} className={styles.spinner} />}
        </div>

        <div className={styles.pills}>
          {readOptions.map((opt) => (
            <button
              key={String(opt.value)}
              className={`${styles.pill} ${filters.is_read === opt.value ? styles.active : ""}`}
              onClick={() => onReadFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.meta}>
        {filters.tag && (
          <span className={styles.activeTag}>
            #{filters.tag}
            <button className={styles.clearTag} onClick={onClearTag}>
              <X size={12} />
            </button>
          </span>
        )}
        <span className={styles.count}>
          {total} {total === 1 ? "bookmark" : "bookmarks"}
        </span>
      </div>
    </div>
  );
}
