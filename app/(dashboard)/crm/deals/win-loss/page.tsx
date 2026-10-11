"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingDown, TrendingUp, Target, BarChart3, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatsStrip } from "@/components/shared/stats-strip";
import { StatusPill } from "@/components/ui/status-pill";
import { IconChip } from "@/components/ui/icon-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { EmptyTargetIllustration } from "@/components/illustrations";
import type { Tone } from "@/lib/design/tones";
import { ScrollArea } from "@/components/ui/scroll-area";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useWinLossAnalysis } from "@/lib/api/hooks/crm";
import { formatINRCompact as formatCurrency } from "@/lib/format-utils";

const REASON_TONES: Tone[] = ["danger", "warning", "plum", "info", "teal", "neutral"];


export default function WinLossAnalysisPage() {
  const { data, isLoading, isError, error, refetch } = useWinLossAnalysis();

  const maxReasonCount = useMemo(
    () => Math.max(1, ...(data?.lostByReason.map((r) => r.count) ?? [])),
    [data]
  );

  if (isLoading) {
    return (
      <PageWrapper title="Win/Loss Analysis" subtitle="Deal outcome breakdown and lost reason attribution">
        <div className="space-y-6">
          <Skeleton className="h-20" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Win/Loss Analysis" subtitle="Deal outcome breakdown and lost reason attribution">
        <QueryErrorState title="Couldn't load win/loss analysis" error={error} onRetry={() => refetch()} />
      </PageWrapper>
    );
  }

  const s = data?.summary ?? { won: 0, wonValue: 0, lost: 0, lostValue: 0, total: 0, winRate: 0 };
  const wonPct = s.total > 0 ? (s.won / s.total) * 100 : 0;
  const lostPct = s.total > 0 ? (s.lost / s.total) * 100 : 0;

  return (
    <PageWrapper
      title="Win/Loss Analysis"
      subtitle="Deal outcome breakdown and lost reason attribution"
    >
      <motion.div
        className="space-y-6"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <StatsStrip
            items={[
              { label: "Won Deals", value: s.won, icon: Trophy, tone: "success" },
              { label: "Lost Deals", value: s.lost, icon: TrendingDown, tone: "danger" },
              { label: "Win Rate", value: `${s.winRate}%`, icon: Target },
              { label: "Won Value", value: formatCurrency(s.wonValue), icon: DollarSign, tone: "brand" },
            ]}
          />
        </motion.div>

        <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-sans text-sm font-semibold">
                <IconChip icon={TrendingUp} size="sm" />
                Outcome Split
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-8 py-4">
                <div className="text-center">
                  <div className="font-display text-4xl font-bold tabular-nums text-success-strong">{s.won}</div>
                  <div className="text-sm text-muted-foreground mt-1">Won</div>
                  <div className="text-xs tabular-nums text-muted-foreground">{formatCurrency(s.wonValue)}</div>
                </div>
                <div className="h-16 w-px bg-border" />
                <div className="text-center">
                  <div className="font-display text-4xl font-bold tabular-nums text-danger-strong">{s.lost}</div>
                  <div className="text-sm text-muted-foreground mt-1">Lost</div>
                  <div className="text-xs tabular-nums text-muted-foreground">{formatCurrency(s.lostValue)}</div>
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs tabular-nums text-muted-foreground">
                  <span>Won {wonPct.toFixed(0)}%</span>
                  <span>Lost {lostPct.toFixed(0)}%</span>
                </div>
                <div role="img" aria-label={`Won ${wonPct.toFixed(0)}%, lost ${lostPct.toFixed(0)}%`} className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full bg-success-500 rounded-l-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${wonPct}%` }}
                    transition={{ duration: 0.8 }}
                  />
                  <motion.div
                    className="h-full bg-danger-500 rounded-r-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${lostPct}%` }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                  />
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total revenue at stake</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(s.wonValue + s.lostValue)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Revenue captured</span>
                  <span className="font-semibold tabular-nums text-success-strong">
                    {s.wonValue + s.lostValue > 0
                      ? `${Math.round((s.wonValue / (s.wonValue + s.lostValue)) * 100)}%`
                      : ""}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-sans text-sm font-semibold">
                <IconChip icon={BarChart3} tone="danger" size="sm" />
                Lost Reason Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!data?.lostByReason || data.lostByReason.length === 0) ? (
                <EmptyState compact illustration={<EmptyTargetIllustration />} title="No lost deals recorded yet" className="border-0 bg-transparent" />
              ) : (
                <ScrollArea className="max-h-[260px]">
                  <div className="space-y-3 pr-2">
                    {data.lostByReason.map((r, i) => {
                      const barPct = (r.count / maxReasonCount) * 100;
                      const tone = REASON_TONES[i % REASON_TONES.length];
                      return (
                        <div key={r.reason}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <StatusPill tone={tone}>{r.reason}</StatusPill>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="font-semibold tabular-nums">{r.count}</span>
                              <span className="w-20 text-right tabular-nums text-muted-foreground">
                                {formatCurrency(r.totalValue)}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-danger-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${barPct}%` }}
                              transition={{ duration: 0.6, delay: i * 0.05 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
