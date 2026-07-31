"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Clock, AlertTriangle, TrendingDown, DollarSign, ArrowLeft, ExternalLink } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTargetIllustration } from "@/components/illustrations";
import { apiClient } from "@/lib/api-client";
import { formatINR } from "@/lib/format-utils";
import { cn } from "@/lib/utils";


interface AgingDeal {
  id: number;
  name: string;
  value: string | null;
  stage: string;
  daysInStage: number;
  createdAt: string;
  updatedAt: string;
  assigneeName: string | null;
}

interface AgingResponse {
  summary: { total: number; stale: number; critical: number };
  deals: AgingDeal[];
}


function useDealAging() {
  return useQuery<AgingResponse>({
    queryKey: ["deals", "aging"],
    queryFn: () => apiClient.get<AgingResponse>("/deals/aging"),
    refetchInterval: 300_000,
  });
}


const STAGE_BADGE: Record<string, { label: string; className: string }> = {
  LEAD:        { label: "Lead",        className: "bg-muted text-muted-foreground border-border" },
  CONTACTED:   { label: "Contacted",   className: "bg-blue/10 text-blue border-blue/20" },
  PROPOSAL:    { label: "Proposal",    className: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
  NEGOTIATION: { label: "Negotiation", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
};

function getStageBadge(stage: string) {
  return STAGE_BADGE[stage] ?? { label: stage, className: "bg-muted text-muted-foreground" };
}

function getDayColor(days: number) {
  if (days > 30) return "text-destructive font-semibold";
  if (days >= 15) return "text-amber-600 dark:text-amber-400 font-medium";
  return "text-muted-foreground";
}

function getSeverityChip(days: number) {
  if (days > 30)
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 inline-block" />
        Critical
      </span>
    );
  if (days >= 15)
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
        Warning
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
      Healthy
    </span>
  );
}


export default function DealAgingPage() {
  const { data, isLoading } = useDealAging();

  const sortedDeals = useMemo(() => {
    if (!data?.deals) return [];
    return [...data.deals].sort((a, b) => b.daysInStage - a.daysInStage);
  }, [data?.deals]);

  const stats = useMemo(() => {
    if (!data) return { totalStale: 0, avgDays: 0, oldestDays: 0, totalValue: 0 };
    const deals = data.deals;
    const stale = deals.filter((d) => d.daysInStage > 14);
    const totalValue = deals.reduce((sum, d) => sum + Number(d.value || 0), 0);
    const avgDays = deals.length > 0
      ? Math.round(deals.reduce((sum, d) => sum + d.daysInStage, 0) / deals.length)
      : 0;
    const oldestDays = deals.length > 0 ? Math.max(...deals.map((d) => d.daysInStage)) : 0;
    return { totalStale: stale.length, avgDays, oldestDays, totalValue };
  }, [data]);

  const backAction = (
    <Button variant="outline" size="sm" asChild>
      <Link href="/crm/deals">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Deals
      </Link>
    </Button>
  );

  if (isLoading) {
    return (
      <PageWrapper
        title="Deal Aging Report"
        subtitle="Deals stuck in pipeline stages"
        actions={backAction}
      >
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Deal Aging Report"
      subtitle="Deals stuck in pipeline stages"
      actions={backAction}
    >
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatCard
            label="Total Stale Deals"
            value={stats.totalStale}
            icon={AlertTriangle}
            color="red"
            index={0}
          />
          <StatCard
            label="Avg Days Stuck"
            value={`${stats.avgDays}d`}
            icon={Clock}
            color="gold"
            index={1}
          />
          <StatCard
            label="Oldest Deal"
            value={`${stats.oldestDays}d`}
            icon={TrendingDown}
            color="purple"
            index={2}
          />
          <StatCard
            label="Total Value at Risk"
            value={formatINR(stats.totalValue)}
            icon={DollarSign}
            color="blue"
            index={3}
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {sortedDeals.length === 0 ? (
              <EmptyState
                illustration={<EmptyTargetIllustration className="h-36 w-36" />}
                title="All deals are moving smoothly"
                description="No deals are currently stuck in any pipeline stage. Keep it up!"
              />
            ) : (
              <ScrollArea className="w-full" type="auto">
                <div className="min-w-[780px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[220px]">Deal Name</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Assignee</TableHead>
                        <TableHead>Days in Stage</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Deal Value</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedDeals.map((deal) => {
                        const badge = getStageBadge(deal.stage);
                        return (
                          <TableRow key={deal.id}>
                            <TableCell className="font-medium">
                              <Link
                                href={`/crm/deals/${deal.id}`}
                                className="hover:underline hover:text-gold transition-colors truncate block max-w-[200px]"
                              >
                                {deal.name}
                              </Link>
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn("text-xs", badge.className)}
                              >
                                {badge.label}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-sm text-muted-foreground">
                              {deal.assigneeName ?? (
                                <span className="italic text-muted-foreground/60">Unassigned</span>
                              )}
                            </TableCell>

                            <TableCell>
                              <span className={cn("text-sm tabular-nums", getDayColor(deal.daysInStage))}>
                                {deal.daysInStage}d
                              </span>
                            </TableCell>

                            <TableCell>{getSeverityChip(deal.daysInStage)}</TableCell>

                            <TableCell className="text-sm tabular-nums">
                              {deal.value ? formatINR(deal.value) : (
                                null
                              )}
                            </TableCell>

                            <TableCell className="text-sm text-muted-foreground tabular-nums">
                              {deal.createdAt
                                ? new Date(deal.createdAt).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : ""}
                            </TableCell>

                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/crm/deals/${deal.id}`}>
                                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                  View Deal
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
