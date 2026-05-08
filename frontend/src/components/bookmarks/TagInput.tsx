import { useState, useRef, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { useTags } from "@/hooks/useBookmarks";
import styles from "./TagInput.module.css";

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, onChange }: Props) {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const { data: allTags = [] } = useTags();
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = allTags.filter(
    (t) =>
      t.toLowerCase().includes(input.toLowerCase()) &&
      !tags.includes(t) &&
      input.length > 0
  );

  const addTag = (tag: string) => {
    const cleaned = tag.trim().toLowerCase();
    if (!cleaned || tags.includes(cleaned) || tags.length >= 10) return;
    onChange([...tags, cleaned]);
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]!);
    }
  };

  return (
    <div className={styles.wrap}>
      <div
        className={`${styles.container} ${focused ? styles.focused : ""}`}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <span key={tag} className={styles.tag}>
            {tag}
            <button
              type="button"
              className={styles.removeTag}
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={tags.length === 0 ? "Add tags…" : ""}
          maxLength={30}
        />
      </div>

      {focused && suggestions.length > 0 && (
        <div className={styles.suggestions}>
          {suggestions.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              className={styles.suggestion}
              onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
