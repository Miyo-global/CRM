"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, DollarSign, Gift } from "lucide-react";
import { formatINR } from "@/lib/format-utils";
import type { BonusStats } from "@/lib/hr/bonus-filters";

interface BonusStatsCardsProps {
  stats: BonusStats;
}

export function BonusStatsCards({ stats }: BonusStatsCardsProps) {
  const cards = [
    { label: "Total bonuses", value: String(stats.total), sub: formatINR(stats.totalAmount), icon: Gift },
    { label: "Pending", value: String(stats.pending), sub: formatINR(stats.pendingAmount), icon: Clock, color: "text-amber-600" },
    { label: "Approved", value: String(stats.approved), sub: "Awaiting payment", icon: DollarSign, color: "text-blue-600" },
    { label: "Paid", value: String(stats.paid), sub: formatINR(stats.paidAmount), icon: CheckCircle2, color: "text-emerald-600" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ label, value, sub, icon: Icon, color }) => (
        <Card key={label}>
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2 text-muted-foreground">
              <Icon className={`h-3.5 w-3.5 ${color ?? ""}`} />
              <span className="text-xs">{label}</span>
            </div>
            <p className="text-xl font-bold tabular-nums">{value}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
