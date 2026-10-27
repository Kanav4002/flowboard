"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { AlertTriangle, Inbox, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { BoardHeader } from "@/components/board/board-header";
import { BoardToolbar } from "@/components/board/board-toolbar";
import { Column } from "@/components/board/column";
import { TaskCardView } from "@/components/board/task-card";
import { TaskDialog } from "@/components/board/task-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFilteredTasks } from "@/hooks/use-filtered-tasks";
import {
  STATUSES,
  isStatus,
  type Status,
  type Task,
} from "@/lib/types";
import { byPosition, truncate } from "@/lib/utils";
import { useBoardStore } from "@/store/board-store";

const BOARD_GRID =
  "mt-4 grid snap-x grid-flow-col auto-cols-[minmax(272px,1fr)] gap-3 overflow-x-auto pb-2 scrollbar-subtle lg:grid-flow-row lg:auto-cols-auto lg:grid-cols-3 lg:overflow-visible";

function findContainer(tasks: Task[], id: string): Status | null {
  if (isStatus(id)) return id;
  return tasks.find((task) => task.id === id)?.status ?? null;
}

/**
 * Prefer what is literally under the pointer (reliable for column drops), then
 * fall back to corner distance so keyboard dragging still works.
 */
const collisionDetection: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args);
  return underPointer.length > 0 ? underPointer : closestCorners(args);
};

function BoardSkeleton() {
  return (
    <div className={BOARD_GRID}>
      {STATUSES.map((status) => (
        <div
          key={status}
          className="rounded-2xl border border-border/70 bg-muted/40 p-3"
        >
          <div className="flex items-center gap-2 pb-4">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-3.5 w-24" />
          </div>
          <div className="space-y-2.5">
            {[0, 1].map((index) => (
              <div
                key={index}
                className="rounded-xl border border-border/70 bg-card p-3"
              >
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="mt-3 h-3.5 w-4/5" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-3/5" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BoardError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/70 px-6 py-14 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-semibold">
        We couldn&apos;t load your board
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onRetry} className="mt-5">
        <RefreshCw />
        Try again
      </Button>
    </div>
  );
}

function EmptyBoard({ onNewTask }: { onNewTask: () => void }) {
  return (
    <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/70 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Inbox className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-base font-semibold">Your board is empty</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Create your first task to start planning. You can drag it between
        columns as it moves forward.
      </p>
      <Button onClick={onNewTask} className="mt-5">
        <Plus />
        Create your first task
      </Button>
      <p className="mt-4 text-[11px] text-muted-foreground/70">
        Tip: press <kbd className="font-mono">N</kbd> anywhere to add a task.
      </p>
    </div>
  );
}

export function Board() {
  const tasks = useBoardStore((state) => state.tasks);
  const isLoading = useBoardStore((state) => state.isLoading);
  const hasLoaded = useBoardStore((state) => state.hasLoaded);
  const error = useBoardStore((state) => state.error);
  const isSavingOrder = useBoardStore((state) => state.isSavingOrder);
  const load = useBoardStore((state) => state.load);
  const deleteTask = useBoardStore((state) => state.deleteTask);
  const createTask = useBoardStore((state) => state.createTask);

  const { grouped, tags, overdue, total, visible, isFiltering } =
    useFilteredTasks();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<Status>("todo");

  const didMoveRef = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void load();
  }, [load]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const openCreate = useCallback((status: Status = "todo") => {
    setEditingTask(null);
    setDefaultStatus(status);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  }, []);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable === true;

      if (isTyping || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        openCreate("todo");
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [openCreate]);

  const activeTask = useMemo(
    () => tasks.find((task) => task.id === activeId) ?? null,
    [tasks, activeId],
  );

  const stats = useMemo(
    () => ({
      inProgress: tasks.filter((task) => task.status === "in_progress").length,
      done: tasks.filter((task) => task.status === "done").length,
    }),
    [tasks],
  );

  function handleDragStart(event: DragStartEvent) {
    didMoveRef.current = false;
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const current = useBoardStore.getState().tasks;
    const activeContainer = findContainer(current, String(active.id));
    const overContainer = findContainer(current, String(over.id));

    if (
      !activeContainer ||
      !overContainer ||
      activeContainer === overContainer
    ) {
      return;
    }

    const overTasks = current
      .filter((task) => task.status === overContainer)
      .sort(byPosition);

    const overIndex =
      over.id === overContainer
        ? overTasks.length
        : overTasks.findIndex((task) => task.id === over.id);

    useBoardStore
      .getState()
      .moveTask(
        String(active.id),
        overContainer,
        overIndex === -1 ? overTasks.length : overIndex,
      );

    didMoveRef.current = true;
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;

    if (over) {
      const current = useBoardStore.getState().tasks;
      const activeContainer = findContainer(current, String(active.id));
      const overContainer = findContainer(current, String(over.id));

      if (
        activeContainer &&
        overContainer &&
        activeContainer === overContainer
      ) {
        const column = current
          .filter((task) => task.status === overContainer)
          .sort(byPosition);

        const oldIndex = column.findIndex((task) => task.id === active.id);
        const newIndex =
          over.id === overContainer
            ? column.length - 1
            : column.findIndex((task) => task.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          useBoardStore
            .getState()
            .moveTask(String(active.id), overContainer, newIndex);
          didMoveRef.current = true;
        }
      }
    }

    if (didMoveRef.current) {
      didMoveRef.current = false;
      void useBoardStore.getState().persistOrder();
    }
  }

  function handleDragCancel() {
    setActiveId(null);
    if (didMoveRef.current) {
      didMoveRef.current = false;
      void useBoardStore.getState().persistOrder();
    }
  }

  async function handleDelete(task: Task) {
    const snapshot = {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      tags: task.tags,
      dueDate: task.dueDate,
    };

    const deleted = await deleteTask(task.id);
    if (!deleted) return;

    toast.success("Task deleted", {
      description: truncate(task.title, 48),
      action: {
        label: "Undo",
        onClick: () => {
          void createTask(snapshot).then((restored) => {
            if (restored) toast.success("Task restored");
          });
        },
      },
    });
  }

  const showSkeleton = (!hasLoaded || isLoading) && !error;

  return (
    <div className="flex min-h-dvh flex-col">
      <BoardHeader
        total={total}
        inProgress={stats.inProgress}
        done={stats.done}
        overdue={overdue}
        isSavingOrder={isSavingOrder}
        onNewTask={() => openCreate("todo")}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-6 sm:px-6 lg:px-8">
        <BoardToolbar
          searchRef={searchRef}
          tags={tags}
          visible={visible}
          total={total}
          isFiltering={isFiltering}
        />

        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {error ? (
            <BoardError message={error} onRetry={() => void load()} />
          ) : showSkeleton ? (
            <BoardSkeleton />
          ) : total === 0 ? (
            <EmptyBoard onNewTask={() => openCreate("todo")} />
          ) : (
            <div className={BOARD_GRID}>
              {STATUSES.map((status) => (
                <Column
                  key={status}
                  status={status}
                  tasks={grouped[status]}
                  totalCount={
                    tasks.filter((task) => task.status === status).length
                  }
                  isFiltered={isFiltering}
                  onAdd={openCreate}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onClearFilters={() =>
                    useBoardStore.getState().clearFilters()
                  }
                />
              ))}
            </div>
          )}

          <DragOverlay
            style={{ zIndex: 40 }}
            dropAnimation={{
              duration: 160,
              easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
            }}
          >
            {activeTask ? (
              <div className="w-[288px] max-w-[80vw] rotate-2 cursor-grabbing">
                <TaskCardView
                  task={activeTask}
                  className="shadow-floating ring-1 ring-primary/10"
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      <footer className="mx-auto w-full max-w-7xl px-4 pb-8 text-[11px] text-muted-foreground/70 sm:px-6 lg:px-8">
        Stored locally in SQLite · Drag with the handle, or focus it and use the
        arrow keys.
      </footer>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        defaultStatus={defaultStatus}
      />
    </div>
  );
}
