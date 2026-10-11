"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CHART_TOOLTIP_STYLE, CHART_AXIS, CHART_GRID } from "@/features/crm/shared/constants";
import { AnalyticsChartCard } from "./analytics-chart-card";

interface LeadVolumeChartProps {
  data: Array<{ week: string; leads: number }>;
}

export function LeadVolumeChart({ data }: LeadVolumeChartProps) {
  return (
    <AnalyticsChartCard title="Lead Volume Trend (12 weeks)" data={data} filename="lead-volume-trend">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid {...CHART_GRID} />
          <XAxis dataKey="week" {...CHART_AXIS} />
          <YAxis {...CHART_AXIS} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Line type="monotone" dataKey="leads" stroke="var(--chart-1)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </AnalyticsChartCard>
  );
}
