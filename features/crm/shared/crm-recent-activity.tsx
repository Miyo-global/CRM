"use client";

import { TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/date-utils";
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

export function CrmRecentActivity({ deals }: CrmRecentActivityProps) {
  const recentDeals = [...(deals || [])]
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime())
    .slice(0, 6);

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-2 px-3 pt-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {recentDeals.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-4">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {recentDeals.map((deal) => {
              const isWon = deal.stage === "WON";
              const isLost = deal.stage === "LOST";
              return (
                <div key={deal.id} className="flex items-start gap-2">
                  <div className={cn(
                    "h-6 w-6 rounded flex items-center justify-center shrink-0 mt-0.5",
                    isWon ? "bg-emerald-500/15 text-emerald-400" :
                    isLost ? "bg-red-500/15 text-red-400" :
                    "bg-gold/10 text-gold",
                  )}>
                    {isWon ? <TrendingUp className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate">{deal.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {STAGE_LABELS[deal.stage] ?? deal.stage}
                      {deal.assignedTo?.name && ` · ${deal.assignedTo.name}`}
                    </p>
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0 tabular-nums">
                    {deal.updatedAt ?? deal.createdAt
                      ? timeAgo((deal.updatedAt ?? deal.createdAt) as string)
                      : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
