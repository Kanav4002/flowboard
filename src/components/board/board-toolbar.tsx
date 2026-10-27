"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITIES, PRIORITY_META, type Priority } from "@/lib/types";
import { cn, pluralize } from "@/lib/utils";
import { useBoardStore } from "@/store/board-store";

type BoardToolbarProps = {
  searchRef: React.RefObject<HTMLInputElement | null>;
  tags: string[];
  visible: number;
  total: number;
  isFiltering: boolean;
};

export function BoardToolbar({
  searchRef,
  tags,
  visible,
  total,
  isFiltering,
}: BoardToolbarProps) {
  const query = useBoardStore((state) => state.filters.query);
  const priority = useBoardStore((state) => state.filters.priority);
  const tag = useBoardStore((state) => state.filters.tag);
  const setFilter = useBoardStore((state) => state.setFilter);
  const clearFilters = useBoardStore((state) => state.clearFilters);

  return (
    <div className="sticky top-0 z-20 -mx-4 mt-6 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setFilter("query", event.target.value)}
              placeholder="Search tasks…"
              aria-label="Search tasks"
              className="bg-card pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setFilter("query", "")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Select
            value={priority}
            onValueChange={(value) =>
              setFilter("priority", value as Priority | "all")
            }
          >
            <SelectTrigger
              aria-label="Filter by priority"
              className="w-[140px] bg-card"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITIES.map((option) => (
                <SelectItem key={option} value={option}>
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        PRIORITY_META[option].dot,
                      )}
                    />
                    {PRIORITY_META[option].label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tag} onValueChange={(value) => setFilter("tag", value)}>
            <SelectTrigger
              aria-label="Filter by tag"
              className="w-[132px] bg-card"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {tags.map((option) => (
                <SelectItem key={option} value={option}>
                  <span className="max-w-[220px] truncate">#{option}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isFiltering && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground"
            >
              <X />
              Reset
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {isFiltering
              ? `${visible} of ${total} ${pluralize(total, "task")}`
              : `${total} ${pluralize(total, "task")}`}
          </p>
          <span className="hidden items-center gap-1 text-[11px] text-muted-foreground/70 sm:flex">
            Press
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
              /
            </kbd>
            to search
          </span>
        </div>
      </div>
    </div>
  );
}
