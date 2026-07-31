"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TrendValue } from "@/types/crm";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: TrendValue;
  sparkData?: number[];
  sparkColor?: string;
}

function TrendBadge({ trend }: { trend: TrendValue }) {
  const Icon = trend.isPositive ? TrendingUp : trend.value === 0 ? Minus : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded",
        trend.value === 0
          ? "bg-muted text-muted-foreground"
          : trend.isPositive
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-red-500/10 text-red-600 dark:text-red-400"
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {Math.abs(trend.value)}%
    </span>
  );
}

function SparkLine({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 28;
  const w = 60;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
}

export function MetricCard({ label, value, icon: Icon, trend, sparkData, sparkColor = "#bd882c" }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
            {trend && (
              <div className="mt-2">
                <TrendBadge trend={trend} />
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            {sparkData && sparkData.length > 1 && (
              <SparkLine data={sparkData} color={sparkColor} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
