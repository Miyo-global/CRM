"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "../../lib/utils";

interface FilterChipProps extends Omit<React.ComponentProps<"button">, "type"> {
  active?: boolean;
  count?: number;
  /** Renders a trailing × button (aria-label "Remove filter"). */
  onRemove?: () => void;
}

/** Toggleable filter pill. `className` styles the outer chip; other props go to the toggle button. */
function FilterChip({ active = false, count, onRemove, className, children, ...props }: FilterChipProps) {
  return (
    <span
      data-slot="filter-pill"
      data-active={active || undefined}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? "border-gold-300 bg-brand-soft text-brand-soft-foreground"
          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
        onRemove && "pr-1",
        className
      )}
    >
      <button
        type="button"
        aria-pressed={active}
        className="inline-flex items-center gap-1.5 rounded-full outline-none focus-visible:focus-ring disabled:pointer-events-none disabled:opacity-50"
        {...props}
      >
        {children}
        {count !== undefined && (
          <span className="rounded-full bg-foreground/10 px-1.5 text-3xs font-semibold tabular-nums">
            {count}
          </span>
        )}
      </button>
      {onRemove && (
        <button
          type="button"
          aria-label="Remove filter"
          onClick={onRemove}
          className="inline-flex size-5 items-center justify-center rounded-full outline-none hover:bg-foreground/10 focus-visible:focus-ring"
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

export { FilterChip };
export type { FilterChipProps };
