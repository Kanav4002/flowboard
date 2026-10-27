import "server-only";

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  isPriority,
  isStatus,
  type Priority,
  type ReorderItem,
  type Status,
  type Task,
} from "./types";
import {
  normalizeTags,
  type TaskCreatePayload,
  type TaskUpdatePayload,
} from "./validation";

const databasePath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), "data", "flowboard.db");

type TaskRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  tags: string;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

type SqlValue = string | number | null;

function parseTags(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tag): tag is string => typeof tag === "string");
  } catch {
    return [];
  }
}

function mapRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: isStatus(row.status) ? row.status : "todo",
    priority: isPriority(row.priority) ? row.priority : "medium",
    tags: parseTags(row.tags),
    dueDate: row.due_date,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dayOffset(days: number): string {
  const now = new Date();
  const date = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + days),
  );
  return date.toISOString().slice(0, 10);
}

function seedTasks(db: DatabaseSync) {
  const now = new Date().toISOString();

  const samples: Array<{
    title: string;
    description: string;
    status: Status;
    priority: Priority;
    tags: string[];
    dueDate: string | null;
  }> = [
    {
      title: "Define Q4 onboarding goals",
      description:
        "Agree on the three activation metrics we want to move and write them into the planning doc.",
      status: "todo",
      priority: "high",
      tags: ["planning", "product"],
      dueDate: dayOffset(3),
    },
    {
      title: "Audit empty states across the app",
      description:
        "Screenshot every empty state, then list the ones that need copy or a call to action.",
      status: "todo",
      priority: "medium",
      tags: ["design", "polish"],
      dueDate: dayOffset(7),
    },
    {
      title: "Wire billing webhooks",
      description:
        "Handle invoice.paid and invoice.payment_failed, then replay fixtures locally.",
      status: "in_progress",
      priority: "high",
      tags: ["backend", "billing"],
      dueDate: dayOffset(2),
    },
    {
      title: "Redesign board filters",
      description:
        "Search plus priority and tag filters, with a single clear affordance to reset them.",
      status: "in_progress",
      priority: "medium",
      tags: ["design", "frontend"],
      dueDate: dayOffset(5),
    },
    {
      title: "Ship keyboard shortcuts",
      description: "N for a new task, / to search, Esc to dismiss the dialog.",
      status: "done",
      priority: "low",
      tags: ["frontend"],
      dueDate: dayOffset(-2),
    },
    {
      title: "Write launch notes",
      description: "Short changelog plus a screenshot of the new board.",
      status: "done",
      priority: "medium",
      tags: ["marketing"],
      dueDate: dayOffset(-1),
    },
  ];

  const insert = db.prepare(
    `INSERT INTO tasks
      (id, title, description, status, priority, tags, due_date, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const counters = new Map<Status, number>();

  db.exec("BEGIN");
  try {
    for (const sample of samples) {
      const position = counters.get(sample.status) ?? 0;
      counters.set(sample.status, position + 1);
      insert.run(
        randomUUID(),
        sample.title,
        sample.description,
        sample.status,
        sample.priority,
        JSON.stringify(sample.tags),
        sample.dueDate,
        position,
        now,
        now,
      );
    }
    db.prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('seeded', ?)").run(
      now,
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function createDatabase(): DatabaseSync {
  mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = new DatabaseSync(databasePath);
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'todo',
      priority    TEXT NOT NULL DEFAULT 'medium',
      tags        TEXT NOT NULL DEFAULT '[]',
      due_date    TEXT,
      position    REAL NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status_position
      ON tasks (status, position);

    CREATE TABLE IF NOT EXISTS app_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const seeded = db
    .prepare("SELECT value FROM app_meta WHERE key = 'seeded'")
    .get() as { value: string } | undefined;

  if (!seeded) {
    const row = db.prepare("SELECT COUNT(*) AS count FROM tasks").get() as {
      count: number;
    };
    if (row.count === 0) seedTasks(db);
  }

  return db;
}

const globalForDb = globalThis as typeof globalThis & {
  __flowboardDb?: DatabaseSync;
};

let instance: DatabaseSync | null = null;

/** Opens the database on first use so builds and route introspection stay side-effect free. */
function getDb(): DatabaseSync {
  if (instance) return instance;
  if (globalForDb.__flowboardDb) return (instance = globalForDb.__flowboardDb);

  instance = createDatabase();
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__flowboardDb = instance;
  }
  return instance;
}

const STATUS_RANK = `CASE status
  WHEN 'todo' THEN 0
  WHEN 'in_progress' THEN 1
  ELSE 2
END`;

export function listTasks(): Task[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM tasks ORDER BY ${STATUS_RANK} ASC, position ASC, created_at ASC`,
    )
    .all() as unknown as TaskRow[];

  return rows.map(mapRow);
}

export function getTask(id: string): Task | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as
    | TaskRow
    | undefined;
  return row ? mapRow(row) : null;
}

function nextPosition(status: Status): number {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT COALESCE(MAX(position), -1) + 1 AS next FROM tasks WHERE status = ?",
    )
    .get(status) as { next: number };
  return row.next;
}

export function createTask(input: TaskCreatePayload): Task {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const status = input.status ?? "todo";

  db.prepare(
    `INSERT INTO tasks
      (id, title, description, status, priority, tags, due_date, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.title,
    input.description ?? "",
    status,
    input.priority ?? "medium",
    JSON.stringify(normalizeTags(input.tags ?? [])),
    input.dueDate ?? null,
    nextPosition(status),
    now,
    now,
  );

  const task = getTask(id);
  if (!task) throw new Error("Task could not be created");
  return task;
}

export function updateTask(id: string, patch: TaskUpdatePayload): Task | null {
  const db = getDb();
  const existing = getTask(id);
  if (!existing) return null;

  const assignments: string[] = [];
  const params: SqlValue[] = [];

  const set = (column: string, value: SqlValue) => {
    assignments.push(`${column} = ?`);
    params.push(value);
  };

  if (patch.title !== undefined) set("title", patch.title);
  if (patch.description !== undefined) set("description", patch.description);
  if (patch.priority !== undefined) set("priority", patch.priority);
  if (patch.tags !== undefined) {
    set("tags", JSON.stringify(normalizeTags(patch.tags)));
  }
  if (patch.dueDate !== undefined) set("due_date", patch.dueDate ?? null);

  if (patch.status !== undefined && patch.status !== existing.status) {
    set("status", patch.status);
    set("position", nextPosition(patch.status));
  }

  set("updated_at", new Date().toISOString());

  db.prepare(`UPDATE tasks SET ${assignments.join(", ")} WHERE id = ?`).run(
    ...params,
    id,
  );

  return getTask(id);
}

export function deleteTask(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  return result.changes > 0;
}

export function reorderTasks(items: ReorderItem[]): Task[] {
  const db = getDb();
  const now = new Date().toISOString();
  const update = db.prepare(
    "UPDATE tasks SET status = ?, position = ?, updated_at = ? WHERE id = ?",
  );

  db.exec("BEGIN");
  try {
    for (const item of items) {
      update.run(item.status, item.position, now, item.id);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return listTasks();
}
