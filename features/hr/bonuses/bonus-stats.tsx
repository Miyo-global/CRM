"use client";

import { CheckCircle2, Clock, IndianRupee, Gift } from "lucide-react";
import { StatsStrip } from "@/components/shared/stats-strip";
import { formatINR } from "@/lib/format-utils";
import type { BonusStats } from "@/lib/hr/bonus-filters";

interface BonusStatsCardsProps {
  stats: BonusStats;
}

export function BonusStatsCards({ stats }: BonusStatsCardsProps) {
  return (
    <StatsStrip
      items={[
        { label: "Total bonuses", value: String(stats.total), hint: formatINR(stats.totalAmount), icon: Gift },
        { label: "Pending", value: String(stats.pending), hint: formatINR(stats.pendingAmount), icon: Clock, tone: "warning" },
        { label: "Approved", value: String(stats.approved), hint: "Awaiting payment", icon: IndianRupee, tone: "info" },
        { label: "Paid", value: String(stats.paid), hint: formatINR(stats.paidAmount), icon: CheckCircle2, tone: "success" },
      ]}
    />
  );
}
