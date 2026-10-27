"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, GripVertical, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PRIORITY_META, type Task } from "@/lib/types";
import { cn, dueMeta, formatDueDate } from "@/lib/utils";

type TaskCardViewProps = {
  task: Task;
  onEdit?: () => void;
  onDelete?: () => void;
  dragHandle?: React.ReactNode;
  className?: string;
};

const DUE_TONE: Record<string, string> = {
  overdue: "text-rose-600 dark:text-rose-400",
  today: "text-amber-600 dark:text-amber-400",
  upcoming: "text-muted-foreground",
};

export function TaskCardView({
  task,
  onEdit,
  onDelete,
  dragHandle,
  className,
}: TaskCardViewProps) {
  const priority = PRIORITY_META[task.priority];
  const rawDue = dueMeta(task.dueDate);
  const due =
    rawDue && task.status === "done" && task.dueDate
      ? {
          label: `Due ${formatDueDate(task.dueDate)}`,
          tone: "upcoming" as const,
        }
      : rawDue;
  const visibleTags = task.tags.slice(0, 3);
  const extraTags = task.tags.length - visibleTags.length;

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-2.5 rounded-xl border border-border/80 bg-card p-3 text-left shadow-card transition-all",
        "hover:border-border hover:shadow-card-hover",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            priority.badge,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", priority.dot)} />
          {priority.label}
        </span>

        {(onEdit || onDelete) && (
          <div className="-mr-1 -mt-1 flex items-center gap-0.5 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onEdit}
                aria-label={`Edit ${task.title}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onDelete}
                aria-label={`Delete ${task.title}`}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-medium leading-snug text-foreground">
          {task.title}
        </h3>
        {task.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {task.description}
          </p>
        )}
      </div>

      {task.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground"
            >
              #{tag}
            </span>
          ))}
          {extraTags > 0 && (
            <span className="text-[11px] text-muted-foreground">
              +{extraTags}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
        {due ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11px] font-medium tabular-nums",
              DUE_TONE[due.tone],
            )}
          >
            <CalendarDays className="h-3 w-3" aria-hidden />
            {due.label}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground/60">
            No due date
          </span>
        )}
        {dragHandle}
      </div>
    </article>
  );
}

type TaskCardProps = {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

export function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", status: task.status },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && "relative z-10")}
    >
      <TaskCardView
        task={task}
        onEdit={() => onEdit(task)}
        onDelete={() => onDelete(task)}
        className={cn(isDragging && "opacity-40")}
        dragHandle={
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${task.title}`}
            className="touch-none rounded p-1 text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        }
      />
    </div>
  );
}
