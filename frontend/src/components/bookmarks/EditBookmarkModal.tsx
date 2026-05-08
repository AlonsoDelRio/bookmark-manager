import { useState, type FormEvent } from "react";
import { X, Loader2 } from "lucide-react";
import { useUpdateBookmark } from "@/hooks/useBookmarks";
import { TagInput } from "./TagInput";
import type { Bookmark } from "@/types";
import styles from "./Modal.module.css";

interface Props {
  bookmark: Bookmark;
  onClose: () => void;
}

export function EditBookmarkModal({ bookmark, onClose }: Props) {
  const [tags, setTags] = useState<string[]>(bookmark.tags);
  const update = useUpdateBookmark();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate(
      { id: bookmark.id, tags },
      { onSuccess: onClose }
    );
  };

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit bookmark</h2>
          <button className={styles.close} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.bookmarkPreview}>
          <p className={styles.previewTitle}>{bookmark.title}</p>
          <p className={styles.previewUrl}>{bookmark.url}</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Tags</label>
            <TagInput tags={tags} onChange={setTags} />
            <p className={styles.hint}>Press Enter or comma to add a tag</p>
          </div>

          {update.isError && (
            <p className={styles.error}>{update.error?.message ?? "Failed to update"}</p>
          )}

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={update.isPending}>
              {update.isPending ? (
                <>
                  <Loader2 size={14} className={styles.spin} />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
