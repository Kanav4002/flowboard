# Flowboard

A focused Kanban board for small teams and solo makers. Flowboard runs on Next.js 15 (App Router) with a SQLite database, optimistic drag-and-drop powered by Zustand, and a shadcn/ui-based design system.

Add a screenshot at `docs/screenshot.png` and reference it here once the app is running locally:
<!-- ![Flowboard board view](docs/screenshot.png) -->

## Features

- **Drag-and-drop board** across `To do`, `In progress`, and `Done` columns, including reordering inside a column, powered by `@dnd-kit` (pointer, touch, and keyboard sensors).
- **Full task CRUD** with title, description, priority, tags, and due date.
- **Search and filters** by free text, priority, and tag — filters compose and apply instantly without extra requests.
- **Optimistic updates** with automatic rollback and a toast if a write fails.
- **Due-date awareness**: overdue and "due today" states are called out on the card.
- **Keyboard shortcuts**: `/` focuses search, `N` opens a new task, and every drag handle works with the arrow keys.
- **Polished states**: skeleton loading, per-column empty states, filtered-empty state, and error recovery with retry.
- **Fully responsive**: three columns on desktop, a horizontally scrollable board on smaller screens.
- **Typed end to end**: Zod schemas shared by the API and the client, plus a hand-written `Task` model.
- **Zero external services**: the database is a local SQLite file created and seeded on first run.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, Route Handlers, Server Components) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3.4, CSS variables, shadcn/ui conventions |
| Components | Radix UI primitives (`dialog`, `select`, `label`, `slot`), `lucide-react`, `sonner` |
| State | Zustand 5 (client store, optimistic mutations) |
| Validation | Zod |
| Database | SQLite via Node's built-in `node:sqlite`, WAL mode |
| Drag & drop | `@dnd-kit/core`, `@dnd-kit/sortable` |

## Requirements

- **Node.js 22.13 or newer** — the app uses the built-in `node:sqlite` module, so there is no native addon to compile and no external database service.
- npm 10 or newer.

Node 22 prints an `ExperimentalWarning` for `node:sqlite` on startup. It is expected and harmless; the API used here (`DatabaseSync`, prepared statements, transactions) is stable in practice.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

Open <http://localhost:3000>. The first request creates `data/flowboard.db`, applies the schema, and seeds six example tasks so the board is not empty.

### Environment variables

Everything is optional and has a sensible default. Copy `.env.example` to `.env.local` if you want to override the database location.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_PATH` | `data/flowboard.db` | Absolute or relative path to the SQLite file |

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:reset` | Delete the local database (re-seeded on next request) |

## Project structure

```
flowboard/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx              # Fonts, metadata, toaster
│  │  ├─ page.tsx                # Board shell (client board + static header)
│  │  ├─ globals.css             # Design tokens, base styles, board animations
│  │  └─ api/
│  │     ├─ tasks/route.ts       # GET list, POST create
│  │     ├─ tasks/[id]/route.ts  # PATCH update, DELETE remove
│  │     └─ tasks/reorder/route.ts # Bulk position/status persistence
│  ├─ components/
│  │  ├─ board/
│  │  │  ├─ board.tsx            # DnD context, filtering, optimistic orchestration
│  │  │  ├─ board-header.tsx     # Title, stats, primary action
│  │  │  ├─ board-toolbar.tsx    # Search + priority/tag filters
│  │  │  ├─ column.tsx           # Droppable column with empty state
│  │  │  ├─ task-card.tsx        # Sortable card
│  │  │  ├─ task-dialog.tsx      # Create/edit form
│  │  │  └─ tag-input.tsx        # Chip-based tag editor
│  │  └─ ui/                     # shadcn-style primitives
│  ├─ hooks/
│  │  └─ use-filtered-tasks.ts   # Derived filtering + tag list
│  ├─ lib/
│  │  ├─ api-client.ts           # Typed fetch wrapper
│  │  ├─ db.ts                   # Connection, schema, seed, queries
│  │  ├─ types.ts                # Domain model + status metadata
│  │  ├─ utils.ts                # cn(), date helpers
│  │  └─ validation.ts           # Zod schemas
│  └─ store/
│     └─ board-store.ts          # Zustand store with optimistic actions
├─ data/                         # SQLite file (git-ignored)
├─ components.json               # shadcn/ui config
├─ tailwind.config.ts
└─ .env.example
```

## Data model

```ts
type Task = {
  id: string;                 // uuid
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  tags: string[];
  dueDate: string | null;     // YYYY-MM-DD
  position: number;           // order within a column
  createdAt: string;          // ISO timestamp
  updatedAt: string;
};
```

Positions are normalised to `0..n-1` per column on every reorder, so there is no gap-rebalancing logic to maintain.

## API

All responses are JSON. Errors use `{ "error": string }` with the appropriate status code.

| Method | Route | Body | Result |
| --- | --- | --- | --- |
| `GET` | `/api/tasks` | – | `{ tasks: Task[] }` |
| `POST` | `/api/tasks` | `TaskCreateInput` | `201 { task }` |
| `GET` | `/api/tasks/:id` | – | `{ task }` |
| `PATCH` | `/api/tasks/:id` | `Partial<TaskCreateInput>` | `{ task }` |
| `DELETE` | `/api/tasks/:id` | – | `204` |
| `POST` | `/api/tasks/reorder` | `{ items: { id, status, position }[] }` | `{ tasks: Task[] }` |

Request bodies are validated with Zod; invalid payloads return `400` with the first validation message.

## Design notes

- **Optimistic writes.** Creating, editing, deleting, and moving all update the Zustand store first, then reconcile with the server response. A failed request restores the previous snapshot and surfaces a toast, so the board never shows state the database rejected.
- **DnD model.** Columns and cards are both droppable. `onDragOver` moves a card between columns for immediate feedback; `onDragEnd` reorders and persists the whole board order in one transactional call.
- **Server boundary.** `lib/db.ts` is server-only and is kept out of the client bundle. Route handlers are the only callers.
- **Accessibility.** Drag handles are keyboard-focusable, every icon button has an accessible label, dialogs trap focus and restore it, and status is never conveyed by colour alone (each card also shows its column and priority words).

## Deploying

The app is a standard Next.js deployment, but SQLite needs a persistent filesystem:

- **Fly.io / Railway / a VM** — mount a volume and point `DATABASE_PATH` at it (e.g. `/data/flowboard.db`).
- **Vercel** — serverless functions do not have a writable, persistent disk. Swap `lib/db.ts` for a hosted Postgres/Supabase client (the rest of the code is storage-agnostic), or run the app on a container host.

## Roadmap

- Multi-board workspaces and sharing
- Auth + per-user boards (Supabase Auth)
- Labels management UI and saved filter views
- Activity log and task comments

## License

MIT
