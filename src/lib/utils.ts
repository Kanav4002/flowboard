import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Task } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseISODay(value: string): Date | null {
  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return valid ? date : null;
}

/** Whole days between today (local) and the given calendar day. */
export function daysUntil(value: string): number {
  const target = parseISODay(value);
  if (!target) return 0;

  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today) / 86_400_000);
}

export function formatDueDate(value: string): string {
  const date = parseISODay(value);
  if (!date) return value;

  const sameYear = date.getUTCFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(date);
}

export type DueTone = "overdue" | "today" | "upcoming";

export function dueMeta(
  value: string | null,
): { label: string; tone: DueTone } | null {
  if (!value) return null;

  const diff = daysUntil(value);
  if (diff < 0) return { label: `Overdue · ${formatDueDate(value)}`, tone: "overdue" };
  if (diff === 0) return { label: "Due today", tone: "today" };
  if (diff === 1) return { label: "Due tomorrow", tone: "upcoming" };
  return { label: `Due ${formatDueDate(value)}`, tone: "upcoming" };
}

export function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

export function byPosition(a: Task, b: Task) {
  if (a.position !== b.position) return a.position - b.position;
  return a.createdAt.localeCompare(b.createdAt);
}

/** Returns a copy of the tasks with `position` renumbered 0..n-1 per column. */
export function withNormalizedPositions(tasks: Task[]): Task[] {
  const counters = new Map<string, number>();

  return [...tasks]
    .sort(byPosition)
    .map((task) => {
      const next = counters.get(task.status) ?? 0;
      counters.set(task.status, next + 1);
      return next === task.position ? task : { ...task, position: next };
    });
}

export function truncate(value: string, max = 60) {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}
