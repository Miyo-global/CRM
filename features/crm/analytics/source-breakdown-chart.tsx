"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { CHART_TOOLTIP_STYLE, CHART_COLORS } from "@/features/crm/shared/constants";
import { AnalyticsChartCard } from "./analytics-chart-card";

interface SourceBreakdownChartProps {
  data: Array<{ name: string; value: number }>;
}

export function SourceBreakdownChart({ data }: SourceBreakdownChartProps) {
  return (
    <AnalyticsChartCard title="Lead Source Breakdown" data={data} filename="lead-sources">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data} cx="50%" cy="50%" outerRadius={100} dataKey="value"
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
          >
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
    </AnalyticsChartCard>
  );
}
