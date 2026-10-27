"use client";

import { useMemo } from "react";

import { useBoardStore } from "@/store/board-store";
import { STATUSES, type Status, type Task } from "@/lib/types";
import { byPosition, daysUntil } from "@/lib/utils";

export function useFilteredTasks() {
  const tasks = useBoardStore((state) => state.tasks);
  const query = useBoardStore((state) => state.filters.query);
  const priority = useBoardStore((state) => state.filters.priority);
  const tag = useBoardStore((state) => state.filters.tag);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return tasks.filter((task) => {
      if (priority !== "all" && task.priority !== priority) return false;
      if (
        tag !== "all" &&
        !task.tags.some((item) => item.toLowerCase() === tag.toLowerCase())
      ) {
        return false;
      }
      if (!needle) return true;

      return (
        task.title.toLowerCase().includes(needle) ||
        task.description.toLowerCase().includes(needle) ||
        task.tags.some((item) => item.toLowerCase().includes(needle))
      );
    });
  }, [tasks, query, priority, tag]);

  const grouped = useMemo(() => {
    const result: Record<Status, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };

    for (const task of filtered) {
      result[task.status].push(task);
    }

    for (const status of STATUSES) {
      result[status].sort(byPosition);
    }

    return result;
  }, [filtered]);

  const tags = useMemo(() => {
    const unique = new Map<string, string>();

    for (const task of tasks) {
      for (const item of task.tags) {
        const key = item.toLowerCase();
        if (!unique.has(key)) unique.set(key, item);
      }
    }

    return [...unique.values()].sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  const overdue = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.status !== "done" &&
          task.dueDate !== null &&
          daysUntil(task.dueDate) < 0,
      ).length,
    [tasks],
  );

  const isFiltering =
    query.trim().length > 0 || priority !== "all" || tag !== "all";

  return {
    tasks,
    filtered,
    grouped,
    tags,
    overdue,
    total: tasks.length,
    visible: filtered.length,
    isFiltering,
  };
}
