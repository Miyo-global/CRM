"use client";

import { memo, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Sprint } from "@/types/projects";

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
} as const;

interface SprintOptionProps {
  sprint: Sprint;
}

const SprintOption = memo(function SprintOption({ sprint }: SprintOptionProps) {
  return (
    <option value={sprint.id}>
      {sprint.status === "ACTIVE" ? `${sprint.name} (Active)` : sprint.name}
    </option>
  );
});

interface BurndownPoint {
  date: string;
  remaining: number;
  ideal: number;
}

interface SprintBurndownChartProps {
  sprints: Sprint[] | undefined;
  burndownChartData: BurndownPoint[];
  sprintId: number;
  onSprintChange: (id: number) => void;
}

export const SprintBurndownChart = memo(function SprintBurndownChart({
  sprints,
  burndownChartData,
  sprintId,
  onSprintChange,
}: SprintBurndownChartProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onSprintChange(Number(e.target.value));
    },
    [onSprintChange],
  );

  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">Sprint Burndown</CardTitle>
          {sprints && sprints.length > 0 && (
            <select
              className="text-xs rounded-md border border-border bg-background px-2 py-1 text-foreground"
              value={sprintId}
              onChange={handleChange}
              aria-label="Select sprint for burndown chart"
            >
              {sprints.map((s) => (
                <SprintOption key={s.id} sprint={s} />
              ))}
            </select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {burndownChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={burndownChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Area
                type="monotone"
                dataKey="ideal"
                stroke="#94a3b8"
                fill="#94a3b8"
                fillOpacity={0.08}
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Ideal"
              />
              <Area
                type="monotone"
                dataKey="remaining"
                stroke="#6366f1"
                fill="#6366f1"
                fillOpacity={0.15}
                strokeWidth={2}
                name="Remaining"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
            {sprints && sprints.length === 0
              ? "No sprints found for this project"
              : "No burndown data available for this sprint"}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
