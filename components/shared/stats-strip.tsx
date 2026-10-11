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
}

/** Compact metrics row in one Card (§6.3); scrolls horizontally on narrow screens. */
function StatsStrip({ items, className }: StatsStripProps) {
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
