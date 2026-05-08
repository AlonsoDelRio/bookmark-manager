import { useState, type FormEvent } from "react";
import { X, Link2, Loader2 } from "lucide-react";
import { useCreateBookmark } from "@/hooks/useBookmarks";
import { TagInput } from "./TagInput";
import styles from "./Modal.module.css";

interface Props {
  onClose: () => void;
}

export function AddBookmarkModal({ onClose }: Props) {
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const create = useCreateBookmark();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = "https://" + finalUrl;
    }

    create.mutate(
      { url: finalUrl, tags },
      { onSuccess: onClose }
    );
  };

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <Link2 size={16} />
          </div>
          <h2 className={styles.title}>Add bookmark</h2>
          <button className={styles.close} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => { void handleSubmit(e); }} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>URL</label>
            <input
              className={styles.input}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              required
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Tags</label>
            <TagInput tags={tags} onChange={setTags} />
            <p className={styles.hint}>Press Enter or comma to add a tag</p>
          </div>

          {create.isError && (
            <p className={styles.error}>{create.error?.message ?? "Failed to save"}</p>
          )}

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={create.isPending || !url.trim()}
            >
              {create.isPending ? (
                <>
                  <Loader2 size={14} className={styles.spin} />
                  Saving…
                </>
              ) : (
                "Save bookmark"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
