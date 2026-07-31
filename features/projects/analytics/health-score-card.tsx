"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HealthBreakdown {
  completionPct: number;
  onTimePct: number;
  velocityScore: number;
  overdueTickets: number;
  totalTickets: number;
}

interface MetricRowProps {
  label: string;
  value: number;
  weight: string;
}

const MetricRow = memo(function MetricRow({ label, value, weight }: MetricRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">
          {label} <span className="opacity-60">({weight} weight)</span>
        </span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
});

const HEALTH_METRICS: Array<{ label: string; key: keyof Pick<HealthBreakdown, "completionPct" | "onTimePct" | "velocityScore">; weight: string }> = [
  { label: "Completion Rate", key: "completionPct", weight: "50%" },
  { label: "On-Time Rate", key: "onTimePct", weight: "30%" },
  { label: "Velocity Score", key: "velocityScore", weight: "20%" },
];

interface HealthScoreCardProps {
  healthScore: number;
  healthStatus: string | undefined;
  healthBreakdown: HealthBreakdown;
}

export const HealthScoreCard = memo(function HealthScoreCard({
  healthScore,
  healthStatus,
  healthBreakdown,
}: HealthScoreCardProps) {
  const healthColor =
    healthStatus === "EXCELLENT"
      ? "text-emerald-500"
      : healthStatus === "GOOD"
        ? "text-blue-500"
        : healthStatus === "AT_RISK"
          ? "text-amber-500"
          : "text-destructive";

  return (
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Project Health Score</CardTitle>
      </CardHeader>
      <CardContent className="pt-1 pb-8">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="text-center">
            <p className={`text-5xl font-bold tabular-nums ${healthColor}`}>{healthScore}</p>
            <p className={`text-sm font-medium mt-1 ${healthColor}`}>
              {healthStatus?.replace(/_/g, " ")}
            </p>
          </div>
          <div className="flex-1 space-y-3 min-w-48">
            {HEALTH_METRICS.map((m) => (
              <MetricRow
                key={m.label}
                label={m.label}
                value={healthBreakdown[m.key]}
                weight={m.weight}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <span className="font-medium text-foreground">{healthBreakdown.overdueTickets}</span>{" "}
              overdue tickets
            </p>
            <p>
              <span className="font-medium text-foreground">{healthBreakdown.totalTickets}</span>{" "}
              total tickets
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
