"use client";

import { PIPELINE_STAGES } from "@/features/crm/shared/constants";

interface CrmPipelineMiniProps {
  byStatus: Record<string, number>;
  total: number;
}

/** Lead funnel as one horizontal stage bar (stage tones) + per-stage rows. Renders inside a WidgetCard. */
export function CrmPipelineMini({ byStatus, total }: CrmPipelineMiniProps) {
  const stages = PIPELINE_STAGES.map((stage) => {
    const count = byStatus[stage.key] ?? 0;
    return { ...stage, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
  });
  const summary = stages.map((s) => `${s.label} ${s.count}`).join(", ");

  return (
    <div className="space-y-4">
      <div role="img" aria-label={`Leads by stage: ${summary}`} className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
        {stages.map((s) =>
          s.count > 0 ? (
            <div
              key={s.key}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(s.count / Math.max(total, 1)) * 100}%`, backgroundColor: s.color }}
              title={`${s.label}: ${s.count}`}
            />
          ) : null
        )}
      </div>

      <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {stages.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{s.label}</span>
            <span className="font-semibold tabular-nums">{s.count}</span>
            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
