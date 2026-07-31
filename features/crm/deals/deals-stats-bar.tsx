"use client";

import { TrendingUp, DollarSign, Trophy, Clock } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { formatINRCompact } from "@/lib/format-utils";

interface DealsStatsBarProps {
  total: number;
  totalValue: number;
  wonValue: number;
  avgProbability: number;
}

export function DealsStatsBar({ total, totalValue, wonValue, avgProbability }: DealsStatsBarProps) {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      <StatCard label="Total Deals" value={total} icon={TrendingUp} index={0} />
      <StatCard label="Pipeline Value" value={formatINRCompact(totalValue)} icon={DollarSign} index={1} />
      <StatCard label="Won Value" value={formatINRCompact(wonValue)} icon={Trophy} index={2} />
      <StatCard label="Avg Probability" value={`${avgProbability}%`} icon={Clock} index={3} />
    </div>
  );
}
