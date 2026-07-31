"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { CHART_TOOLTIP_STYLE } from "@/features/crm/shared/constants";
import { AnalyticsChartCard } from "./analytics-chart-card";

interface ConversionChartProps {
  data: Array<{ name: string; value: number }>;
}

const SLICE_COLORS: Record<string, string> = {
  Won: "#10B981",
  Lost: "#EF4444",
};
const DEFAULT_SLICE_COLOR = "#9CA3AF";

export function ConversionChart({ data }: ConversionChartProps) {
  return (
    <AnalyticsChartCard title="Won vs Lost" data={data} filename="won-vs-lost">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data} cx="50%" cy="50%" outerRadius={100} dataKey="value"
            label={({ name, value }: { name?: string; value?: number }) => `${name ?? ""}: ${value ?? 0}`}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={SLICE_COLORS[entry.name] ?? DEFAULT_SLICE_COLOR} />
            ))}
          </Pie>
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </AnalyticsChartCard>
  );
}
