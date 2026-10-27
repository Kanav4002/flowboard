"use client";

import { Check, Columns3, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BoardHeaderProps = {
  total: number;
  inProgress: number;
  done: number;
  overdue: number;
  isSavingOrder: boolean;
  onNewTask: () => void;
};

const STATS = [
  { key: "total", label: "Total", dot: "bg-slate-400" },
  { key: "inProgress", label: "In progress", dot: "bg-sky-500" },
  { key: "done", label: "Done", dot: "bg-emerald-500" },
  { key: "overdue", label: "Overdue", dot: "bg-rose-500" },
] as const;

export function BoardHeader({
  total,
  inProgress,
  done,
  overdue,
  isSavingOrder,
  onNewTask,
}: BoardHeaderProps) {
  const values = { total, inProgress, done, overdue };

  return (
    <header className="border-b border-border/60 bg-background/70">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-sm ring-1 ring-inset ring-white/20">
              <Columns3 className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">Flowboard</p>
              <p className="text-[11px] text-muted-foreground">
                Local workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"
              aria-live="polite"
            >
              {isSavingOrder ? (
                <>
                  <Loader2
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                  />
                  Saving order…
                </>
              ) : (
                <>
                  <Check
                    className="h-3.5 w-3.5 text-emerald-500"
                    aria-hidden="true"
                  />
                  Synced
                </>
              )}
            </span>
            <Button onClick={onNewTask}>
              <Plus />
              New task
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 pb-7 pt-2 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Product board
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Plan the week, drag work forward, and keep every deadline honest.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {STATS.map((stat) => (
              <div
                key={stat.key}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 shadow-sm sm:justify-start",
                  stat.key === "overdue" &&
                    values[stat.key] === 0 &&
                    "opacity-60",
                )}
              >
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", stat.dot)}
                  aria-hidden="true"
                />
                <span className="text-xs font-semibold tabular-nums">
                  {values[stat.key]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
