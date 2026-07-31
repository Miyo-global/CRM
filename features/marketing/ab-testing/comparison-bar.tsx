"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

interface ComparisonBarProps {
  label: string;
  rate: number;
  maxRate: number;
  isWinner: boolean;
}

export const ComparisonBar = memo(function ComparisonBar({
  label,
  rate,
  maxRate,
  isWinner,
}: ComparisonBarProps) {
  const pct = maxRate > 0 ? (rate / maxRate) * 100 : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span
          className={cn(
            "font-medium",
            isWinner ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "tabular-nums font-semibold",
            isWinner ? "text-amber-600 dark:text-amber-400" : "text-foreground"
          )}
        >
          {rate}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isWinner ? "bg-amber-500" : "bg-primary/50"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
});
