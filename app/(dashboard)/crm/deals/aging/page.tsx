"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Clock, AlertTriangle, TrendingDown, DollarSign, ArrowLeft, ExternalLink } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatsStrip } from "@/components/shared/stats-strip";
import { StatusPill } from "@/components/ui/status-pill";
import { QueryErrorState } from "@/components/ui/query-error-state";
import type { Tone } from "@/lib/design/tones";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTargetIllustration } from "@/components/illustrations";
import { apiClient } from "@/lib/api-client";
import { formatINR } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import { DEFAULT_LOCALE } from "@/lib/constants/locale";


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


const STAGE_BADGE: Record<string, { label: string; tone: Tone }> = {
  LEAD:        { label: "Lead",        tone: "info" },
  CONTACTED:   { label: "Contacted",   tone: "teal" },
  PROPOSAL:    { label: "Proposal",    tone: "warning" },
  NEGOTIATION: { label: "Negotiation", tone: "plum" },
};

function getStageBadge(stage: string) {
  return STAGE_BADGE[stage] ?? { label: stage, tone: "neutral" as const };
}

function getDayColor(days: number) {
  if (days > 30) return "text-danger-strong font-semibold";
  if (days >= 15) return "text-warning-strong font-medium";
  return "text-muted-foreground";
}

function getSeverityChip(days: number) {
  if (days > 30) return <StatusPill tone="danger" dot>Critical</StatusPill>;
  if (days >= 15) return <StatusPill tone="warning" dot>Warning</StatusPill>;
  return <StatusPill tone="success" dot>Healthy</StatusPill>;
}


export default function DealAgingPage() {
  const { data, isLoading, isError, error, refetch } = useDealAging();

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
    <Button variant="outline" asChild>
      <Link href="/crm/deals">
        <ArrowLeft />
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
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
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
      {isError ? (
        <QueryErrorState title="Couldn't load deal aging" error={error} onRetry={() => refetch()} />
      ) : (
      <div className="space-y-6">
        <StatsStrip
          items={[
            { label: "Total Stale Deals", value: stats.totalStale, icon: AlertTriangle, tone: stats.totalStale > 0 ? "danger" : undefined },
            { label: "Avg Days Stuck", value: `${stats.avgDays}d`, icon: Clock },
            { label: "Oldest Deal", value: `${stats.oldestDays}d`, icon: TrendingDown },
            { label: "Total Value at Risk", value: formatINR(stats.totalValue), icon: DollarSign, tone: "brand" },
          ]}
        />

        <Card>
          <CardContent className="p-0">
            {sortedDeals.length === 0 ? (
              <EmptyState
                illustration={<EmptyTargetIllustration />}
                className="border-0"
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
                        <TableHead className="text-right">Deal Value</TableHead>
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
                                className="hover:underline hover:text-brand-text transition-colors truncate block max-w-[200px]"
                              >
                                {deal.name}
                              </Link>
                            </TableCell>

                            <TableCell>
                              <StatusPill tone={badge.tone}>{badge.label}</StatusPill>
                            </TableCell>

                            <TableCell className="text-sm text-muted-foreground">
                              {deal.assigneeName ?? (
                                <span className="text-subtle-foreground">Unassigned</span>
                              )}
                            </TableCell>

                            <TableCell>
                              <span className={cn("text-sm tabular-nums", getDayColor(deal.daysInStage))}>
                                {deal.daysInStage}d
                              </span>
                            </TableCell>

                            <TableCell>{getSeverityChip(deal.daysInStage)}</TableCell>

                            <TableCell className="text-right text-sm tabular-nums">
                              {deal.value ? formatINR(deal.value) : (
                                null
                              )}
                            </TableCell>

                            <TableCell className="text-sm text-muted-foreground tabular-nums">
                              {deal.createdAt
                                ? new Date(deal.createdAt).toLocaleDateString(DEFAULT_LOCALE, {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : ""}
                            </TableCell>

                            <TableCell className="text-right">
                              <Button variant="ghost" size="xs" asChild>
                                <Link href={`/crm/deals/${deal.id}`}>
                                  <ExternalLink />
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
      )}
    </PageWrapper>
  );
}
