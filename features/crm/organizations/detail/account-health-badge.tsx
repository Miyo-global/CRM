"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrgRollup } from "@/types/crm";

interface AccountHealthBadgeProps {
  healthScore: number | null;
  rollup?: OrgRollup | null;
  showComputed?: boolean;
  className?: string;
}


export function computeHealthScore(rollup: OrgRollup): number {
  let score = 0;
  score += Math.min(rollup.totalContacts * 10, 30);
  score += Math.min(rollup.openDeals * 10, 40);
  if (rollup.totalLeads > 0) score += 20;
  if (rollup.totalDealValue > 100_000) score += 10;
  return Math.min(score, 100);
}

export function getHealthLabel(score: number): { label: string; color: string; dot: string } {
  if (score >= 70) return { label: "Healthy", color: "text-emerald-400", dot: "bg-emerald-400" };
  if (score >= 40) return { label: "At Risk", color: "text-amber-400", dot: "bg-amber-400" };
  return { label: "Critical", color: "text-red-400", dot: "bg-red-400" };
}

export function AccountHealthBadge({ healthScore, rollup, showComputed = false, className }: AccountHealthBadgeProps) {
  const score =
    healthScore !== null && healthScore !== undefined
      ? healthScore
      : rollup && showComputed
        ? computeHealthScore(rollup)
        : null;

  if (score === null) {
    return (
      <Badge className={cn("text-xs bg-muted/50 text-muted-foreground border-0", className)}>
        N/A
      </Badge>
    );
  }

  const { label, color, dot } = getHealthLabel(score);

  return (
    <Badge
      className={cn(
        "text-xs border-0 flex items-center gap-1.5 px-2 py-0.5",
        score >= 70 ? "bg-emerald-500/15" : score >= 40 ? "bg-amber-500/15" : "bg-red-500/15",
        color,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
      {label} · {score}%
    </Badge>
  );
}
