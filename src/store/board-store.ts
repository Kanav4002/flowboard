"use client";

import { create } from "zustand";
import { toast } from "sonner";

import { errorMessage, tasksApi } from "@/lib/api-client";
import type {
  BoardFilters,
  Status,
  Task,
  TaskCreateInput,
  TaskUpdateInput,
} from "@/lib/types";
import { byPosition, withNormalizedPositions } from "@/lib/utils";

const DEFAULT_FILTERS: BoardFilters = {
  query: "",
  priority: "all",
  tag: "all",
};

type BoardStore = {
  tasks: Task[];
  isLoading: boolean;
  isSavingOrder: boolean;
  hasLoaded: boolean;
  error: string | null;
  filters: BoardFilters;

  load: () => Promise<void>;
  createTask: (input: TaskCreateInput) => Promise<boolean>;
  updateTask: (id: string, patch: TaskUpdateInput) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  moveTask: (id: string, status: Status, index: number) => void;
  persistOrder: () => Promise<boolean>;
  setFilter: <K extends keyof BoardFilters>(key: K, value: BoardFilters[K]) => void;
  clearFilters: () => void;
};

function tempId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `temp-${uuid ?? Math.random().toString(36).slice(2)}`;
}

function nextPosition(tasks: Task[], status: Status): number {
  return withNormalizedPositions(tasks).filter((task) => task.status === status)
    .length;
}

export const useBoardStore = create<BoardStore>()((set, get) => ({
  tasks: [],
  isLoading: false,
  isSavingOrder: false,
  hasLoaded: false,
  error: null,
  filters: DEFAULT_FILTERS,

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const { tasks } = await tasksApi.list();
      set({
        tasks: withNormalizedPositions(tasks),
        isLoading: false,
        hasLoaded: true,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        hasLoaded: true,
        error: errorMessage(error),
      });
    }
  },

  createTask: async (input) => {
    const status = input.status ?? "todo";
    const now = new Date().toISOString();
    const id = tempId();

    const optimistic: Task = {
      id,
      title: input.title.trim(),
      description: input.description?.trim() ?? "",
      status,
      priority: input.priority ?? "medium",
      tags: input.tags ?? [],
      dueDate: input.dueDate ?? null,
      position: nextPosition(get().tasks, status),
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      tasks: withNormalizedPositions([...state.tasks, optimistic]),
    }));

    try {
      const { task } = await tasksApi.create({
        ...input,
        title: optimistic.title,
        description: optimistic.description,
        status,
        priority: optimistic.priority,
        tags: optimistic.tags,
        dueDate: optimistic.dueDate,
      });

      set((state) => ({
        tasks: withNormalizedPositions(
          state.tasks.map((current) => (current.id === id ? task : current)),
        ),
      }));
      return true;
    } catch (error) {
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
      }));
      toast.error("Could not create the task", {
        description: errorMessage(error),
      });
      return false;
    }
  },

  updateTask: async (id, patch) => {
    const snapshot = get().tasks;
    const existing = snapshot.find((task) => task.id === id);
    if (!existing) return false;

    const optimistic: Task = {
      ...existing,
      ...patch,
      tags: patch.tags ? [...patch.tags] : existing.tags,
      position:
        patch.status && patch.status !== existing.status
          ? nextPosition(snapshot, patch.status)
          : existing.position,
      updatedAt: new Date().toISOString(),
    };

    set({
      tasks: withNormalizedPositions(
        snapshot.map((task) => (task.id === id ? optimistic : task)),
      ),
    });

    try {
      const { task } = await tasksApi.update(id, patch);
      set((state) => ({
        tasks: withNormalizedPositions(
          state.tasks.map((current) => (current.id === id ? task : current)),
        ),
      }));
      return true;
    } catch (error) {
      set({ tasks: snapshot });
      toast.error("Could not update the task", {
        description: errorMessage(error),
      });
      return false;
    }
  },

  deleteTask: async (id) => {
    const snapshot = get().tasks;
    if (!snapshot.some((task) => task.id === id)) return false;

    set({ tasks: snapshot.filter((task) => task.id !== id) });

    try {
      await tasksApi.remove(id);
      set((state) => ({
        tasks: withNormalizedPositions(state.tasks),
      }));
      return true;
    } catch (error) {
      set({ tasks: snapshot });
      toast.error("Could not delete the task", {
        description: errorMessage(error),
      });
      return false;
    }
  },

  moveTask: (id, status, index) => {
    set((state) => {
      const moving = state.tasks.find((task) => task.id === id);
      if (!moving) return state;

      const remaining = state.tasks.filter((task) => task.id !== id);
      const target = remaining
        .filter((task) => task.status === status)
        .sort(byPosition);

      const clamped = Math.max(0, Math.min(index, target.length));
      target.splice(clamped, 0, { ...moving, status });

      const rest = remaining.filter((task) => task.status !== status);
      return { tasks: withNormalizedPositions([...rest, ...target]) };
    });
  },

  persistOrder: async () => {
    const snapshot = get().tasks;
    if (snapshot.some((task) => task.id.startsWith("temp-"))) return false;

    set({ isSavingOrder: true });

    try {
      const { tasks } = await tasksApi.reorder(
        snapshot.map((task) => ({
          id: task.id,
          status: task.status,
          position: task.position,
        })),
      );

      set({ tasks: withNormalizedPositions(tasks), isSavingOrder: false });
      return true;
    } catch (error) {
      set({ isSavingOrder: false });
      toast.error("Could not save the new order", {
        description: errorMessage(error),
      });

      // Resync so the board never shows an order the database rejected.
      try {
        const { tasks } = await tasksApi.list();
        set({ tasks: withNormalizedPositions(tasks) });
      } catch {
        // The error toast already tells the user something is wrong.
      }

      return false;
    }
  },

  setFilter: (key, value) => {
    set((state) => ({ filters: { ...state.filters, [key]: value } }));
  },

  clearFilters: () => set({ filters: DEFAULT_FILTERS }),
}));
