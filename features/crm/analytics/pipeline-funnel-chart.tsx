"use client";

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CHART_TOOLTIP_STYLE, AXIS_TICK } from "@/features/crm/shared/constants";
import { AnalyticsChartCard } from "./analytics-chart-card";

interface PipelineFunnelChartProps {
  data: Array<{ name: string; value: number; fill: string }>;
}

export function PipelineFunnelChart({ data }: PipelineFunnelChartProps) {
  return (
    <AnalyticsChartCard title="Pipeline Funnel" data={data} filename="pipeline-funnel">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" tick={AXIS_TICK} />
          <YAxis dataKey="name" type="category" tick={AXIS_TICK} width={80} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </AnalyticsChartCard>
  );
}
