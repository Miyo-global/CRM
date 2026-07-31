"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingDown, TrendingUp, Target, BarChart3, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { useWinLossAnalysis } from "@/lib/api/hooks/crm";
import { formatINRCompact as formatCurrency } from "@/lib/format-utils";

const REASON_COLORS = [
  "bg-red-500/20 text-red-400 border-red-500/30",
  "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "bg-rose-500/20 text-rose-400 border-rose-500/30",
  "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "bg-slate-500/20 text-slate-400 border-slate-500/30",
];


export default function WinLossAnalysisPage() {
  const { data, isLoading } = useWinLossAnalysis();

  const maxReasonCount = useMemo(
    () => Math.max(1, ...(data?.lostByReason.map((r) => r.count) ?? [])),
    [data]
  );

  if (isLoading) {
    return (
      <PageWrapper title="Win/Loss Analysis" subtitle="Deal outcome breakdown and lost reason attribution">
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
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
        <motion.div variants={fadeUp} className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatCard
            label="Won Deals"
            value={s.won}
            color="green"
            icon={Trophy}
          />
          <StatCard
            label="Lost Deals"
            value={s.lost}
            color="red"
            icon={TrendingDown}
          />
          <StatCard
            label="Win Rate"
            value={`${s.winRate}%`}
            color="gold"
            icon={Target}
          />
          <StatCard
            label="Won Value"
            value={formatCurrency(s.wonValue)}
            color="blue"
            icon={DollarSign}
          />
        </motion.div>

        <motion.div variants={fadeUp} className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gold" />
                Outcome Split
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-8 py-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-emerald-400">{s.won}</div>
                  <div className="text-sm text-muted-foreground mt-1">Won</div>
                  <div className="text-xs text-muted-foreground">{formatCurrency(s.wonValue)}</div>
                </div>
                <div className="h-16 w-px bg-border" />
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-400">{s.lost}</div>
                  <div className="text-sm text-muted-foreground mt-1">Lost</div>
                  <div className="text-xs text-muted-foreground">{formatCurrency(s.lostValue)}</div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Won {wonPct.toFixed(0)}%</span>
                  <span>Lost {lostPct.toFixed(0)}%</span>
                </div>
                <div className="h-4 w-full rounded-full bg-muted overflow-hidden flex">
                  <motion.div
                    className="h-full bg-emerald-500 rounded-l-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${wonPct}%` }}
                    transition={{ duration: 0.8 }}
                  />
                  <motion.div
                    className="h-full bg-red-500 rounded-r-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${lostPct}%` }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                  />
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total revenue at stake</span>
                  <span className="font-semibold">{formatCurrency(s.wonValue + s.lostValue)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Revenue captured</span>
                  <span className="font-semibold text-emerald-400">
                    {s.wonValue + s.lostValue > 0
                      ? `${Math.round((s.wonValue / (s.wonValue + s.lostValue)) * 100)}%`
                      : ""}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-red-400" />
                Lost Reason Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!data?.lostByReason || data.lostByReason.length === 0) ? (
                <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                  No lost deals recorded yet
                </div>
              ) : (
                <ScrollArea className="max-h-[260px]">
                  <div className="space-y-3 pr-2">
                    {data.lostByReason.map((r, i) => {
                      const barPct = (r.count / maxReasonCount) * 100;
                      const colorClass = REASON_COLORS[i % REASON_COLORS.length];
                      return (
                        <div key={r.reason}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn("text-[10px] border", colorClass)}
                              >
                                {r.reason}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="font-semibold tabular-nums">{r.count}</span>
                              <span className="text-muted-foreground w-20 text-right">
                                {formatCurrency(r.totalValue)}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-red-500/60"
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
