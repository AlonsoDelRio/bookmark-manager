import { Plus } from "lucide-react";
import styles from "./Header.module.css";

interface Props {
  onAddClick: () => void;
  user: string;
}

export function Header({ onAddClick, user }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h1 className={styles.title}>My Bookmarks</h1>
        <span className={styles.userBadge}>{user}</span>
      </div>
      <button className={styles.addBtn} onClick={onAddClick}>
        <Plus size={16} />
        Add bookmark
      </button>
    </header>
  );
}
