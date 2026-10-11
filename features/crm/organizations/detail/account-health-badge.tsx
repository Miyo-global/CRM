"use client";

import { StatusPill } from "@/components/ui/status-pill";
import { toneDot, toneText, type Tone } from "@/lib/design/tones";
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

export function getHealthLabel(score: number): { label: string; color: string; dot: string; tone: Tone } {
  if (score >= 70) return { label: "Healthy", color: toneText.success, dot: toneDot.success, tone: "success" };
  if (score >= 40) return { label: "At Risk", color: toneText.warning, dot: toneDot.warning, tone: "warning" };
  return { label: "Critical", color: toneText.danger, dot: toneDot.danger, tone: "danger" };
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
      <StatusPill tone="neutral" className={className}>
        N/A
      </StatusPill>
    );
  }

  const { label, tone } = getHealthLabel(score);

  return (
    <StatusPill tone={tone} dot className={cn("tabular-nums", className)}>
      {label} · {score}%
    </StatusPill>
  );
}
