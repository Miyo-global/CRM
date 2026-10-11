"use client";

import { formatINRCompact } from "@/lib/format-utils";
import { StatsStrip } from "@/components/shared/stats-strip";
import { cn } from "@/lib/utils";
import { toneDot } from "@/lib/design/tones";
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
      <StatsStrip
        items={[
          { label: "Total", value: stats.total },
          { label: "New/Mo", value: stats.thisMonth, tone: "success" },
          { label: "Conv%", value: `${stats.conversionRate}%` },
          { label: "Pipeline", value: formatINRCompact(stats.totalPotentialValue), tone: "brand" },
          { label: "Unassigned", value: stats.unassigned, tone: stats.unassigned > 0 ? "danger" : undefined },
        ]}
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs">
        {Object.entries(stats.byStatus).map(([status, count]) => {
          const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
          if (!config) return null;
          return (
            <div key={status} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={cn("size-2 rounded-full", toneDot[config.tone])} />
              <span className="text-muted-foreground">{config.label}</span>
              <span className="font-semibold tabular-nums">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
