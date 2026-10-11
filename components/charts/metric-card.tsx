"use client";

import type { LucideIcon } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import type { TrendValue } from "@/types/crm";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: TrendValue;
  sparkData?: number[];
  /** Kept for compatibility; StatCard's sparkline uses the chart-1 token. */
  sparkColor?: string;
}

/** Metric card = StatCard (§6.2). */
export function MetricCard({ label, value, icon, trend, sparkData }: MetricCardProps) {
  return (
    <StatCard
      label={label}
      value={value}
      icon={icon as LucideIcon}
      trend={trend}
      sparkline={sparkData && sparkData.length > 1 ? sparkData : undefined}
    />
  );
}
