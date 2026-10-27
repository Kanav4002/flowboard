"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/board/task-card";
import { STATUS_META, type Status, type Task } from "@/lib/types";
import { cn } from "@/lib/utils";

type ColumnProps = {
  status: Status;
  tasks: Task[];
  totalCount: number;
  isFiltered: boolean;
  onAdd: (status: Status) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onClearFilters: () => void;
};

export function Column({
  status,
  tasks,
  totalCount,
  isFiltered,
  onAdd,
  onEdit,
  onDelete,
  onClearFilters,
}: ColumnProps) {
  const meta = STATUS_META[status];
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: "column", status },
  });

  return (
    <section
      aria-labelledby={`column-${status}`}
      className="flex snap-start flex-col rounded-2xl border border-border/70 bg-muted/40"
    >
      <header className="flex items-center justify-between gap-2 px-3 pb-1 pt-3">
        <div className="flex items-center gap-2">
          <span
            className={cn("h-2 w-2 rounded-full", meta.dot)}
            aria-hidden="true"
          />
          <h2 id={`column-${status}`} className="text-sm font-semibold">
            {meta.label}
          </h2>
          <span className="rounded-full border border-border/60 bg-background/80 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {isFiltered ? `${tasks.length}/${totalCount}` : totalCount}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onAdd(status)}
          aria-label={`Add task to ${meta.label}`}
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus />
        </Button>
      </header>

      <p className="px-3 pb-2 text-[11px] text-muted-foreground">
        {meta.description}
      </p>

      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col gap-2.5 rounded-b-2xl border-t border-transparent p-2.5 transition-colors",
          isOver && "border-primary/20 bg-primary/[0.04]",
        )}
      >
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/80 px-4 py-8 text-center">
            <p className="text-xs font-medium text-muted-foreground">
              {isFiltered ? "No tasks match" : meta.emptyTitle}
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground/70">
              {isFiltered
                ? "Try a different search or filter."
                : meta.emptyHint}
            </p>
            {isFiltered ? (
              <Button
                variant="link"
                size="sm"
                onClick={onClearFilters}
                className="h-auto p-0 text-xs"
              >
                Clear filters
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAdd(status)}
                className="mt-1 text-xs text-muted-foreground"
              >
                <Plus />
                Add task
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
