"use client";

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CHART_TOOLTIP_STYLE, CHART_AXIS } from "@/features/crm/shared/constants";
import { AnalyticsChartCard } from "./analytics-chart-card";

interface PipelineFunnelChartProps {
  data: Array<{ name: string; value: number; fill: string }>;
}

export function PipelineFunnelChart({ data }: PipelineFunnelChartProps) {
  return (
    <AnalyticsChartCard
      title="Pipeline Funnel"
      data={data}
      filename="pipeline-funnel"
      legend={data.slice(1).map((step, i) => {
        const prev = data[i].value;
        const pct = prev > 0 ? Math.round((step.value / prev) * 100) : 0;
        return (
          <span key={step.name} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-soft px-2 py-0.5 text-2xs text-neutral-strong">
            <span aria-hidden="true" className="size-2 rounded-full" style={{ background: step.fill }} />
            {data[i].name} → {step.name}
            <span className="font-semibold tabular-nums">{pct}%</span>
          </span>
        );
      })}
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" {...CHART_AXIS} />
          <YAxis dataKey="name" type="category" {...CHART_AXIS} width={80} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </AnalyticsChartCard>
  );
}
