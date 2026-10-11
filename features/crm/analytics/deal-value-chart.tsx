"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CHART_TOOLTIP_STYLE, CHART_AXIS, CHART_GRID } from "@/features/crm/shared/constants";
import { AnalyticsChartCard } from "./analytics-chart-card";
import { CURRENCY_SYMBOL } from "@/lib/constants/locale";

interface DealValueChartProps {
  data: Array<{ stage: string; value: number }>;
}

export function DealValueChart({ data }: DealValueChartProps) {
  return (
    <AnalyticsChartCard title="Deal Value by Stage" data={data} filename="deal-value-by-stage">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid {...CHART_GRID} />
          <XAxis dataKey="stage" {...CHART_AXIS} />
          <YAxis {...CHART_AXIS} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => [`${CURRENCY_SYMBOL}${value}L`, "Value"]} />
          <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </AnalyticsChartCard>
  );
}
