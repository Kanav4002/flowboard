"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { MAX_TAGS, normalizeTags } from "@/lib/validation";

type TagInputProps = {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
};

export function TagInput({ id, value, onChange, disabled }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const atLimit = value.length >= MAX_TAGS;

  function commit() {
    if (!draft.trim()) {
      setDraft("");
      return;
    }
    onChange(normalizeTags([...value, draft]));
    setDraft("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
      return;
    }
    if (
      event.key === "Backspace" &&
      draft.length === 0 &&
      value.length > 0
    ) {
      event.preventDefault();
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5 shadow-sm transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md bg-secondary py-0.5 pl-2 pr-1 text-xs text-secondary-foreground"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((item) => item !== tag))}
            aria-label={`Remove ${tag} tag`}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <input
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        disabled={disabled || atLimit}
        maxLength={24}
        placeholder={
          value.length === 0
            ? "Type a tag and press Enter"
            : atLimit
              ? "Tag limit reached"
              : "Add another…"
        }
        className="h-6 min-w-[7rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed"
      />
    </div>
  );
}
