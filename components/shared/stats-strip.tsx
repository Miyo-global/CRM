import * as React from "react";

import { cn } from "@/lib/utils";
import { toneText, type Tone } from "@/lib/design/tones";
import { Card } from "@/components/ui/card";

interface StatsStripItem {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}

interface StatsStripProps {
  items: StatsStripItem[];
  className?: string;
  /** Shown in place of the strip when every figure is zero. */
  emptyLabel?: string;
}

/** True for 0, "0", "₹0", "0%", "0/0" and the like. */
function isZeroValue(value: React.ReactNode): boolean {
  if (value == null) return true;
  if (typeof value === "number") return value === 0;
  if (typeof value !== "string") return false;
  const digits = value.replace(/[^0-9]/g, "");
  return digits.length > 0 && Number(digits) === 0;
}

/**
 * Compact metrics row in one Card (§6.3); scrolls horizontally on narrow
 * screens.
 *
 * A strip whose every figure is zero said nothing and filled the page with
 * ₹0 and +0% cards, so it collapses to a single line instead (QA-D003).
 */
function StatsStrip({ items, className, emptyLabel = "Nothing to report yet." }: StatsStripProps) {
  if (items.length > 0 && items.every((item) => isZeroValue(item.value))) {
    return (
      <Card className={cn("px-4 py-3", className)}>
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </Card>
    );
  }

  return (
    <Card className={cn("flex-row divide-x divide-border overflow-x-auto", className)}>
      {items.map(({ label, value, hint, tone, icon: Icon }) => (
        <div key={label} className="min-w-36 flex-1 px-4 py-3">
          <div className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground">
            {Icon && <Icon className={cn("size-3.5", tone && toneText[tone])} aria-hidden="true" />}
            <span className="truncate">{label}</span>
          </div>
          <div className={cn("mt-1 font-display text-xl font-semibold tabular-nums", tone && toneText[tone])}>
            {value}
          </div>
          {hint && <div className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</div>}
        </div>
      ))}
    </Card>
  );
}

export { StatsStrip };
export type { StatsStripItem, StatsStripProps };
