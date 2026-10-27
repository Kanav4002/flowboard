import type {
  ReorderItem,
  Task,
  TaskCreateInput,
  TaskUpdateInput,
} from "./types";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: unknown };
      if (typeof payload.error === "string" && payload.error) {
        message = payload.error;
      }
    } catch {
      // Keep the status-based fallback when the body is not JSON.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}

export const tasksApi = {
  list: () => request<{ tasks: Task[] }>("/api/tasks"),

  create: (input: TaskCreateInput) =>
    request<{ task: Task }>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (id: string, input: TaskUpdateInput) =>
    request<{ task: Task }>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  remove: (id: string) =>
    request<void>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  reorder: (items: ReorderItem[]) =>
    request<{ tasks: Task[] }>("/api/tasks/reorder", {
      method: "POST",
      body: JSON.stringify({ items }),
    }),
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}
