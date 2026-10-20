"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "../../lib/utils";
import { EmptyState } from "./empty-state";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        "relative w-full overflow-x-auto rounded-lg border border-border bg-card",
        // Already inside a card / bordered wrapper: drop our own chrome to avoid double borders.
        "in-data-[slot=card]:rounded-none in-data-[slot=card]:border-0 in-data-[slot=card]:bg-transparent",
        "[.border>&]:rounded-none [.border>&]:border-0 [.border>&]:bg-transparent"
      )}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "sticky top-0 z-sticky bg-surface-sunken [&_tr]:border-b [&_tr]:hover:bg-transparent",
        className
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-surface-sunken border-t border-border font-medium tabular-nums [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border transition-colors duration-150 hover:bg-accent/60 data-[state=selected]:bg-brand-soft",
        className
      )}
      {...props}
    />
  );
}

/**
 * `pinned` keeps a column (row actions) stuck to the right edge while the
 * table scrolls sideways, so it is never clipped off-screen (QA-BUG-11).
 */
const PINNED_RIGHT =
  "sticky right-0 z-[1] bg-card shadow-[inset_1px_0_0_var(--color-border)] [tr:hover>&]:bg-accent";

type PinnableProps = { pinned?: "right" };

function TableHead({ className, pinned, ...props }: React.ComponentProps<"th"> & PinnableProps) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-9 px-3 text-left align-middle text-2xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-0.5",
        pinned === "right" && cn(PINNED_RIGHT, "bg-surface-sunken [tr:hover>&]:bg-surface-sunken"),
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, pinned, ...props }: React.ComponentProps<"td"> & PinnableProps) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-(--cell-py) align-middle text-sm whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-0.5",
        pinned === "right" && PINNED_RIGHT,
        className
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-xs", className)}
      {...props}
    />
  );
}

interface TableEmptyProps {
  /** Number of columns the empty row should span. */
  colSpan: number;
  /** Title shown in the compact empty state. */
  message?: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  /** Custom content; replaces the default compact EmptyState. */
  children?: React.ReactNode;
}

/** Full-width "no rows" row for a TableBody. */
function TableEmpty({
  colSpan,
  message = "No results",
  description,
  icon,
  className,
  children,
}: TableEmptyProps) {
  return (
    <tr data-slot="table-empty" className="hover:bg-transparent">
      <td colSpan={colSpan} className={cn("p-0", className)}>
        {children ?? (
          <EmptyState compact icon={icon} title={message} description={description} />
        )}
      </td>
    </tr>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableEmpty,
};
