import { Bookmark, Plus, Tag, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import styles from "./Sidebar.module.css";

interface Props {
  tags: string[];
  activeTag: string | undefined;
  onTagSelect: (tag: string | undefined) => void;
  onAddClick: () => void;
}

export function Sidebar({ tags, activeTag, onTagSelect, onAddClick }: Props) {
  const { signOut } = useAuth();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <Bookmark size={18} strokeWidth={1.5} />
          <span className={styles.brandName}>Tags</span>
        </div>

        <button className={styles.addBtn} onClick={onAddClick}>
          <Plus size={16} />
          New bookmark
        </button>

        <nav className={styles.nav}>
          <button
            className={`${styles.navItem} ${!activeTag ? styles.active : ""}`}
            onClick={() => onTagSelect(undefined)}
          >
            <Home size={15} strokeWidth={1.5} />
            All bookmarks
          </button>
        </nav>

        {tags.length > 0 && (
          <div className={styles.tagsSection}>
            <p className={styles.sectionLabel}>
              <Tag size={12} />
              Tags
            </p>
            <div className={styles.tagsList}>
              {tags.map((tag) => (
                <button
                  key={tag}
                  className={`${styles.tag} ${activeTag === tag ? styles.activeTag : ""}`}
                  onClick={() => onTagSelect(activeTag === tag ? undefined : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={styles.bottom}>
        <button className={styles.signOut} onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
