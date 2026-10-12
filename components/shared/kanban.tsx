import * as React from "react";
import type { DroppableProvidedProps } from "@hello-pangea/dnd";

import { cn } from "@/lib/utils";
import { toneDot, type Tone } from "@/lib/design/tones";
import { Badge } from "@/components/ui/badge";

/** Board canvas (§8.4): sunken, horizontally scrolling row of columns; snaps on mobile. */
function KanbanCanvas({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "kanban-scroll flex snap-x snap-mandatory items-start gap-3 overflow-x-auto bg-surface-sunken p-4 md:snap-none",
        className
      )}
      {...props}
    />
  );
}

interface KanbanColumnShellProps {
  title: React.ReactNode;
  tone: Tone;
  /** Stored (user-chosen) status colour; overrides the tone dot when set. */
  color?: string | null;
  count: number;
  /** Right-aligned summary, e.g. summed value. */
  summary?: React.ReactNode;
  /** Ghost icon buttons (Plus / MoreHorizontal). */
  actions?: React.ReactNode;
  isDraggingOver?: boolean;
  children: React.ReactNode;
  /** Pass `provided.innerRef` from `<Droppable>`. */
  innerRef?: React.Ref<HTMLDivElement>;
  /** Pass `provided.droppableProps` from `<Droppable>`. */
  droppableProps?: DroppableProvidedProps;
  /** Rendered below the droppable list (e.g. quick add). */
  footer?: React.ReactNode;
  className?: string;
}

/** Column chrome (§8.4); the inner list div receives the dnd ref/props, so `provided.placeholder` goes in children. */
function KanbanColumnShell({
  title,
  tone,
  color,
  count,
  summary,
  actions,
  isDraggingOver,
  children,
  innerRef,
  droppableProps,
  footer,
  className,
}: KanbanColumnShellProps) {
  return (
    <div className={cn("flex w-[296px] shrink-0 snap-start flex-col rounded-lg bg-muted/60", className)}>
      <div className="flex h-11 items-center gap-2 px-3">
        <span
          aria-hidden="true"
          className={cn("size-2 shrink-0 rounded-full", !color && toneDot[tone])}
          style={color ? { backgroundColor: color } : undefined}
        />
        <span className="min-w-0 truncate text-sm font-semibold">{title}</span>
        <Badge variant="secondary" className="tabular-nums">
          {count}
        </Badge>
        <div className="ml-auto flex items-center gap-1">
          {summary && <span className="text-xs tabular-nums text-muted-foreground">{summary}</span>}
          {actions}
        </div>
      </div>
      <div
        ref={innerRef}
        {...droppableProps}
        className={cn(
          "min-h-24 flex-1 space-y-2 rounded-b-lg p-2 transition-colors",
          isDraggingOver && "bg-brand-soft/60 ring-1 ring-gold-300 ring-inset"
        )}
      >
        {children}
      </div>
      {footer}
    </div>
  );
}

/** Card classes (§8.4); combine with `provided.draggableProps` (keep its style/transform). */
function kanbanCardClass(isDragging = false) {
  return cn(
    "block rounded-md border border-border bg-card p-3 shadow-xs outline-none transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-md focus-visible:focus-ring",
    isDragging && "rotate-[1deg] shadow-lg ring-1 ring-gold-400"
  );
}

/** Dashed "Drop here" placeholder for empty columns. */
function KanbanEmptyDrop({ label = "Drop here", className }: { label?: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-20 items-center justify-center rounded-md border border-dashed border-border-strong text-xs text-subtle-foreground",
        className
      )}
    >
      {label}
    </div>
  );
}

export { KanbanCanvas, KanbanColumnShell, KanbanEmptyDrop, kanbanCardClass };
export type { KanbanColumnShellProps };
