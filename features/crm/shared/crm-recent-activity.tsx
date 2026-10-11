"use client";

import { TrendingUp, TrendingDown, IndianRupee } from "lucide-react";
import { Timeline } from "@/components/shared/timeline";
import type { Deal } from "@/types/crm";

interface CrmRecentActivityProps {
  deals: Deal[];
}

const STAGE_LABELS: Record<string, string> = {
  WON: "Deal won",
  LOST: "Deal lost",
  PROPOSAL: "Proposal sent",
  NEGOTIATION: "In negotiation",
  CONTACTED: "Contact made",
};

/** Latest deal movements as a compact timeline. Renders inside a WidgetCard. */
export function CrmRecentActivity({ deals }: CrmRecentActivityProps) {
  const recentDeals = [...(deals || [])]
    .filter((d) => d.updatedAt ?? d.createdAt)
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime())
    .slice(0, 6);

  return (
    <Timeline
      groupByDay={false}
      emptyLabel="No recent activity"
      items={recentDeals.map((deal) => ({
        id: String(deal.id),
        icon: deal.stage === "WON" ? TrendingUp : deal.stage === "LOST" ? TrendingDown : IndianRupee,
        tone: deal.stage === "WON" ? "success" : deal.stage === "LOST" ? "danger" : "brand",
        title: <span className="font-medium">{deal.name}</span>,
        body: (
          <span className="text-xs">
            {STAGE_LABELS[deal.stage] ?? deal.stage}
            {deal.assignedTo?.name && ` · ${deal.assignedTo.name}`}
          </span>
        ),
        timestamp: (deal.updatedAt ?? deal.createdAt) as string,
      }))}
    />
  );
}
