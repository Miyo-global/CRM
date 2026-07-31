"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { RevenueVsGoalEntryResult } from "@/lib/api/hooks/crm";

interface RevenueVsGoalChartProps {
  data: RevenueVsGoalEntryResult[];
  height?: number;
}

function formatK(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export function RevenueVsGoalChart({ data, height = 280 }: RevenueVsGoalChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatK}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          formatter={(value, name) => [
            formatK(Number(value ?? 0)),
            name === "actual" ? "Closed Revenue" : "Target",
          ]}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            borderColor: "hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
        />
        <Legend
          iconType="rect"
          iconSize={10}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          formatter={(value) => (value === "actual" ? "Closed Revenue" : "Target")}
        />
        <Bar dataKey="target" fill="hsl(var(--muted-foreground) / 0.3)" radius={[3, 3, 0, 0]} maxBarSize={32} />
        <Bar dataKey="actual" fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
