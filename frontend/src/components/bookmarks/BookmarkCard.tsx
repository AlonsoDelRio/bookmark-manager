import { useState } from "react";
import { ExternalLink, Check, MoreHorizontal, Tag } from "lucide-react";
import { useToggleRead, useDeleteBookmark } from "@/hooks/useBookmarks";
import { EditBookmarkModal } from "./EditBookmarkModal";
import type { Bookmark } from "@/types";
import styles from "./BookmarkCard.module.css";

interface Props {
  bookmark: Bookmark;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BookmarkCard({ bookmark }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const toggleRead = useToggleRead();
  const deleteMutation = useDeleteBookmark();

  const handleToggle = () => {
    toggleRead.mutate({ id: bookmark.id, is_read: !bookmark.is_read });
  };

  const handleDelete = () => {
    deleteMutation.mutate(bookmark.id);
    setShowDeleteConfirm(false);
  };

  const domain = (() => {
    try {
      return new URL(bookmark.url).hostname.replace("www.", "");
    } catch {
      return bookmark.url;
    }
  })();

  return (
    <>
      <article
        className={`${styles.card} ${bookmark.is_read ? styles.read : ""} fade-in`}
      >
        <div className={styles.cardTop}>
          <div className={styles.siteInfo}>
            {bookmark.favicon_url && (
              <img
                src={bookmark.favicon_url}
                alt=""
                className={styles.favicon}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <span className={styles.domain}>{domain}</span>
          </div>

          <div className={styles.actions}>
            <button
              className={`${styles.readBtn} ${bookmark.is_read ? styles.readActive : ""}`}
              onClick={handleToggle}
              title={bookmark.is_read ? "Mark as unread" : "Mark as read"}
              disabled={toggleRead.isPending}
            >
              <Check size={14} strokeWidth={2.5} />
            </button>

            <div className={styles.menuWrap}>
              <button
                className={styles.menuBtn}
                onClick={() => setShowMenu((v) => !v)}
                onBlur={() => setTimeout(() => setShowMenu(false), 150)}
              >
                <MoreHorizontal size={16} />
              </button>
              {showMenu && (
                <div className={styles.menu}>
                  <button className={styles.menuItem} onClick={() => { setShowEdit(true); setShowMenu(false); }}>
                    Edit tags
                  </button>
                  <button
                    className={`${styles.menuItem} ${styles.danger}`}
                    onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.titleLink}
        >
          <h3 className={styles.title}>{bookmark.title}</h3>
          <ExternalLink size={12} className={styles.extIcon} />
        </a>

        <p className={styles.url}>{bookmark.url}</p>

        {bookmark.tags.length > 0 && (
          <div className={styles.tags}>
            <Tag size={11} className={styles.tagIcon} />
            {bookmark.tags.map((t) => (
              <span key={t} className={styles.tag}>
                {t}
              </span>
            ))}
          </div>
        )}

        <p className={styles.date}>{formatDate(bookmark.created_at)}</p>
      </article>

      {showDeleteConfirm && (
        <div className={styles.overlay}>
          <div className={styles.confirmDialog}>
            <h3 className={styles.confirmTitle}>Delete bookmark?</h3>
            <p className={styles.confirmText}>
              &ldquo;{bookmark.title}&rdquo; will be permanently removed.
            </p>
            <div className={styles.confirmBtns}>
              <button
                className={styles.cancelBtn}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className={styles.deleteBtn}
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <EditBookmarkModal
          bookmark={bookmark}
          onClose={() => setShowEdit(false)}
        />
      )}
    </>
  );
}
