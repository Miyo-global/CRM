"use client";

import { TrendingUp, DollarSign, Trophy, Clock } from "lucide-react";
import { StatsStrip } from "@/components/shared/stats-strip";
import { formatINRCompact } from "@/lib/format-utils";

interface DealsStatsBarProps {
  total: number;
  totalValue: number;
  wonValue: number;
  avgProbability: number;
}

export function DealsStatsBar({ total, totalValue, wonValue, avgProbability }: DealsStatsBarProps) {
  return (
    <StatsStrip
      items={[
        { label: "Total Deals", value: total, icon: TrendingUp },
        { label: "Pipeline Value", value: formatINRCompact(totalValue), icon: DollarSign, tone: "brand" },
        { label: "Won Value", value: formatINRCompact(wonValue), icon: Trophy, tone: "success" },
        { label: "Avg Probability", value: `${avgProbability}%`, icon: Clock },
      ]}
    />
  );
}
