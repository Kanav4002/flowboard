export const STATUSES = ["todo", "in_progress", "done"] as const;
export type Status = (typeof STATUSES)[number];

export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export type Task = {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  tags: string[];
  /** ISO calendar day (`YYYY-MM-DD`) or null when the task has no deadline. */
  dueDate: string | null;
  /** Order inside its column, normalised to 0..n-1. */
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type TaskCreateInput = {
  title: string;
  description?: string;
  status?: Status;
  priority?: Priority;
  tags?: string[];
  dueDate?: string | null;
};

export type TaskUpdateInput = Partial<TaskCreateInput>;

export type ReorderItem = {
  id: string;
  status: Status;
  position: number;
};

export type BoardFilters = {
  query: string;
  priority: Priority | "all";
  tag: string | "all";
};

export const STATUS_META: Record<
  Status,
  {
    label: string;
    description: string;
    dot: string;
    emptyTitle: string;
    emptyHint: string;
  }
> = {
  todo: {
    label: "To do",
    description: "Queued and ready to pick up",
    dot: "bg-slate-400",
    emptyTitle: "Nothing queued",
    emptyHint: "Add a task or drop one here to plan it.",
  },
  in_progress: {
    label: "In progress",
    description: "Actively being worked on",
    dot: "bg-indigo-500",
    emptyTitle: "No work in flight",
    emptyHint: "Drag a card here when you start on it.",
  },
  done: {
    label: "Done",
    description: "Shipped, reviewed, and closed",
    dot: "bg-emerald-500",
    emptyTitle: "Nothing shipped yet",
    emptyHint: "Finished work lands here.",
  },
};

export const PRIORITY_META: Record<
  Priority,
  { label: string; badge: string; dot: string; rank: number }
> = {
  low: {
    label: "Low",
    badge:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
    dot: "bg-slate-400",
    rank: 0,
  },
  medium: {
    label: "Medium",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    dot: "bg-amber-500",
    rank: 1,
  },
  high: {
    label: "High",
    badge:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
    dot: "bg-rose-500",
    rank: 2,
  },
};

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

export function isPriority(value: unknown): value is Priority {
  return (
    typeof value === "string" && (PRIORITIES as readonly string[]).includes(value)
  );
}
