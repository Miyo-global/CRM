"use client";

import { cn } from "@/lib/utils";
import { formatINRCompact } from "@/lib/format-utils";
import { STATUS_CONFIG } from "./leads-constants";

interface LeadsStatsBarProps {
  stats: {
    total: number;
    thisMonth: number;
    byStatus: { QUALIFIED: number; CONVERTED: number; [key: string]: number };
    conversionRate: number;
    unassigned: number;
    totalPotentialValue: number;
  };
}

export function LeadsStatsBar({ stats }: LeadsStatsBarProps) {
  return (
    <div className="space-y-2">

      <div className="flex items-center gap-3 flex-wrap text-[11px] px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Total</span>
          <span className="font-bold tabular-nums text-foreground">{stats.total}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">New/Mo</span>
          <span className="font-bold tabular-nums text-emerald-400">{stats.thisMonth}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Conv%</span>
          <span className="font-bold tabular-nums text-amber-400">{stats.conversionRate}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Pipeline</span>
          <span className="font-bold tabular-nums text-gold">{formatINRCompact(stats.totalPotentialValue)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Unassigned</span>
          <span className={cn("font-bold tabular-nums", stats.unassigned > 0 ? "text-red-400" : "text-muted-foreground")}>{stats.unassigned}</span>
        </div>
        <div className="border-l border-border/50 h-3" />

        {Object.entries(stats.byStatus).map(([status, count]) => {
          const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
          if (!config) return null;
          return (
            <div key={status} className="flex items-center gap-1">
              <div className={cn("w-1.5 h-1.5 rounded-full", config.bg.replace("/10", ""))} />
              <span className="text-muted-foreground">{config.label}</span>
              <span className="font-bold tabular-nums">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
