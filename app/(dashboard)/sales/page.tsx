"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  DollarSign,
  Trophy,
  TrendingUp,
  Target,
  ArrowUpRight,
  Medal,
  Phone,
  Users,
  UserX,
  CalendarClock,
  Mail,
  MapPin,
  AlertCircle,
  BarChart3,
  Filter,
  Clock,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MetricCard } from "@/components/charts/metric-card";
import { MiniAreaChart } from "@/components/charts/mini-area-chart";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { SalesFunnelChart } from "@/components/charts/sales-funnel-chart";
import { RevenueVsGoalChart } from "@/components/charts/revenue-vs-goal-chart";
import { ActivityFeed } from "@/components/charts/activity-feed";
import { formatCurrency } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import {
  useSalesDashboard,
  useCrmPeopleSlugs,
  useSalesDashboardKPIs,
  useSalesDashboardFunnel,
  useSalesDashboardLeaderboard,
  useRevenueVsGoal,
  useDealVelocity,
  useAgingDeals,
  useSalesCycleLength,
  useLostDealAnalysis,
} from "@/lib/hooks/trpc-hooks";
import { useSession } from "next-auth/react";
import { staggerContainer, fadeUp, slideInLeft, scaleIn } from "@/lib/motion-variants";
import { safeMax, calcPercent } from "@/lib/format-utils";
import { getColorSafe, stageColors, rankStyles, sparkColors } from "@/lib/theme-constants";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_BAR_COLOR,
  formatRevenueValue,
  type DatePreset,
  DATE_PRESET_LABELS,
  getPresetRange,
} from "./_lib/utils";


export default function SalesDashboardPage() {
  const { data: session } = useSession();
  const isSalesRep = session?.user?.role === "SALES";

  const [datePreset, setDatePreset] = useState<DatePreset>("this_month");
  const [repId, setRepId] = useState<number | undefined>(undefined);

  const dateRange = useMemo(() => getPresetRange(datePreset), [datePreset]);

  const { data, isLoading } = useSalesDashboard();
  const { data: slugMap } = useCrmPeopleSlugs();

  const { data: kpisData } = useSalesDashboardKPIs({ ...dateRange, repId });
  const { data: funnelData } = useSalesDashboardFunnel({ ...dateRange, repId });
  const { data: leaderboardData } = useSalesDashboardLeaderboard(dateRange);
  const { data: revenueVsGoalData } = useRevenueVsGoal();

  const salesStats = data?.salesStats;
  const revenueTimeline = data?.revenueTimeline ?? [];
  const salesFunnel = data?.salesFunnel ?? [];
  const topDeals = data?.topDeals ?? [];
  const salesActivity = data?.salesActivity ?? [];
  const dealsByStage = data?.dealsByStage ?? [];
  const enhanced = data?.enhancedMetrics;

  const salesLeaderboard = data?.salesLeaderboard ?? [];

  const maxLeaderboardRevenue = useMemo(
    () => safeMax((leaderboardData ?? salesLeaderboard).map((r) => r.revenue)),
    [leaderboardData, salesLeaderboard],
  );
  const maxDealsByStageCount = useMemo(
    () => safeMax(dealsByStage.map((d) => d.count)),
    [dealsByStage],
  );
  const revenueSparkData = useMemo(
    () => revenueTimeline.map((d) => d.value),
    [revenueTimeline],
  );

  const getPersonSlug = useCallback(
    (name: string) => slugMap?.[name] ?? null,
    [slugMap],
  );

  const handleDatePresetChange = useCallback((value: string) => {
    setDatePreset(value as DatePreset);
  }, []);

  const handleRepChange = useCallback((value: string) => {
    setRepId(value === "all" ? undefined : Number(value));
  }, []);

  const repOptions = useMemo(() => {
    const reps = leaderboardData ?? [];
    return reps.map((r) => ({ id: r.repId, name: r.name }));
  }, [leaderboardData]);

  const kpiPipeline = kpisData?.pipelineValue ?? salesStats?.pipeline.value ?? 0;
  const kpiDealsWon = kpisData?.dealsWon ?? salesStats?.dealsWon.value ?? 0;
  const kpiCloseRate = kpisData?.closeRate ?? salesStats?.conversionRate.value ?? 0;
  const kpiAvgDeal = kpisData?.avgDealSize ?? salesStats?.avgDealSize.value ?? 0;

  const kpiPipelineTrend =
    kpisData
      ? {
          value: Math.round(Math.abs(((kpisData.totalRevenue - kpisData.prevRevenue) / Math.max(kpisData.prevRevenue, 1)) * 1000) / 10),
          isPositive: kpisData.totalRevenue >= kpisData.prevRevenue,
        }
      : salesStats?.pipeline.trend ?? { value: 0, isPositive: true };

  const kpiCloseRateTrend =
    kpisData
      ? {
          value: Math.round(Math.abs(kpisData.closeRate - kpisData.prevCloseRate) * 10) / 10,
          isPositive: kpisData.closeRate >= kpisData.prevCloseRate,
        }
      : salesStats?.conversionRate.trend ?? { value: 0, isPositive: true };

  const kpiAvgDealTrend =
    kpisData
      ? {
          value: Math.round(Math.abs(((kpisData.avgDealSize - kpisData.prevAvgDealSize) / Math.max(kpisData.prevAvgDealSize, 1)) * 1000) / 10),
          isPositive: kpisData.avgDealSize >= kpisData.prevAvgDealSize,
        }
      : salesStats?.avgDealSize.trend ?? { value: 0, isPositive: true };

  const activeFunnel = funnelData ?? salesFunnel;

  const { data: velocityData } = useDealVelocity(dateRange);
  const { data: agingData } = useAgingDeals(14);
  const { data: cycleData } = useSalesCycleLength(repId !== undefined ? String(repId) : undefined);
  const { data: lostData } = useLostDealAnalysis(repId !== undefined ? String(repId) : undefined);

  if (isLoading || !salesStats) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-7 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
            <CardContent><Skeleton className="h-[240px] w-full" /></CardContent>
          </Card>
          <Card className="lg:col-span-5">
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent><Skeleton className="h-[240px] w-full" /></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper
      title={isSalesRep ? "My Sales Hub" : "Sales Dashboard"}
      subtitle={
        isSalesRep
          ? "Your pipeline, deals, and performance at a glance"
          : "Pipeline overview and sales performance metrics"
      }
    >
      <motion.div
        className="space-y-4 pb-2"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <Card className="shadow-noir">
            <CardContent className="py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filter:</span>
                </div>

                <Select value={datePreset} onValueChange={handleDatePresetChange}>
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(DATE_PRESET_LABELS) as [DatePreset, string][]).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>

                {repOptions.length > 0 && (
                  <Select
                    value={repId !== undefined ? String(repId) : "all"}
                    onValueChange={handleRepChange}
                  >
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue placeholder="All Reps" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        All Reps
                      </SelectItem>
                      {repOptions.map((rep) => (
                        <SelectItem key={rep.id} value={String(rep.id)} className="text-xs">
                          {rep.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {datePreset !== "all" && (
                  <span className="text-xs text-muted-foreground">
                    {DATE_PRESET_LABELS[datePreset]}
                    {dateRange.from && dateRange.to && (
                      <> · {dateRange.from} → {dateRange.to}</>
                    )}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Pipeline Value"
            value={formatCurrency(kpiPipeline)}
            icon={DollarSign}
            trend={kpiPipelineTrend}
            sparkData={revenueSparkData}
            sparkColor={sparkColors.blue}
          />
          <MetricCard
            label="Deals Won"
            value={kpiDealsWon}
            icon={Trophy}
            trend={salesStats.dealsWon.trend}
            sparkColor={sparkColors.green}
          />
          <MetricCard
            label="Close Rate"
            value={`${kpiCloseRate}%`}
            icon={TrendingUp}
            trend={kpiCloseRateTrend}
            sparkColor={sparkColors.purple}
          />
          <MetricCard
            label="Avg Deal Size"
            value={formatCurrency(kpiAvgDeal)}
            icon={Target}
            trend={kpiAvgDealTrend}
            sparkColor={sparkColors.amber}
          />
        </motion.div>

        {enhanced && (
          <motion.div variants={fadeUp}>
            <Card className="shadow-noir">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gold" />
                  Live CRM Metrics (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
                  {[
                    { label: "Active Clients", value: enhanced.activeClients, icon: Users, color: "text-emerald-500" },
                    { label: "Inactive Clients", value: enhanced.inactiveClients, icon: UserX, color: "text-red-400" },
                    { label: "Total Calls", value: enhanced.totalCalls, icon: Phone, color: "text-blue-500" },
                    { label: "Meetings", value: enhanced.totalMeetings, icon: CalendarClock, color: "text-purple-500" },
                    { label: "Emails Sent", value: enhanced.totalEmails, icon: Mail, color: "text-amber-500" },
                    { label: "Site Visits", value: enhanced.totalSiteVisits, icon: MapPin, color: "text-cyan-500" },
                    {
                      label: "Need Follow-up",
                      value: enhanced.followUpNeeded,
                      icon: AlertCircle,
                      color: enhanced.followUpNeeded > 0 ? "text-red-500" : "text-muted-foreground",
                    },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border bg-muted/30"
                    >
                      <m.icon className={cn("h-5 w-5", m.color)} />
                      <span className="text-2xl font-bold text-foreground">{m.value}</span>
                      <span className="text-[11px] text-muted-foreground text-center leading-tight">
                        {m.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          <motion.div className="lg:col-span-7" variants={fadeUp}>
            <Card className="h-full shadow-noir">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gold" />
                  Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MiniAreaChart
                  data={revenueTimeline}
                  color={sparkColors.blue}
                  height={240}
                  formatValue={formatRevenueValue}
                />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div className="lg:col-span-5" variants={fadeUp}>
            <Card className="h-full shadow-noir">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-gold" />
                  Pipeline Funnel
                  {datePreset !== "all" && (
                    <span className="ml-auto text-[10px] font-normal text-muted-foreground">
                      {DATE_PRESET_LABELS[datePreset]}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {funnelData ? (
                  <SalesFunnelChart data={funnelData} />
                ) : (
                  <FunnelChart data={activeFunnel} />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div variants={fadeUp}>
          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gold" />
                Revenue vs Target ({new Date().getFullYear()})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueVsGoalChart data={revenueVsGoalData ?? []} />
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <motion.div variants={fadeUp}>
            <Card className="h-full shadow-noir">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-gold" />
                  Top Deals
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topDeals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No deals in this period.</p>
                ) : (
                <div className="space-y-3">
                  {topDeals.map((deal, i) => (
                    <div
                      key={`${deal.company}-${deal.stage}-${i}`}
                      className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {deal.company}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={cn(
                              "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                              getColorSafe(stageColors, deal.stage),
                            )}
                          >
                            {deal.stage}
                          </span>
                          {getPersonSlug(deal.rep) ? (
                            <Link
                              href={`/sales/person/${getPersonSlug(deal.rep)}`}
                              className="text-xs text-gold hover:underline"
                            >
                              {deal.rep}
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">{deal.rep}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(deal.value)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{deal.probability}% prob</p>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Card className="h-full shadow-noir">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-gold" />
                  Sales Leaderboard
                  {datePreset !== "all" && (
                    <span className="ml-auto text-[10px] font-normal text-muted-foreground">
                      {DATE_PRESET_LABELS[datePreset]}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(leaderboardData ?? salesLeaderboard).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No activity in this period.</p>
                ) : (
                <div className="space-y-2">
                  {(leaderboardData ?? salesLeaderboard).map((rep, i) => {
                    const isTop3 = i < 3;
                    const style = isTop3 && i < rankStyles.length ? rankStyles[i] : null;
                    const revenuePercent = Number(calcPercent(rep.revenue, maxLeaderboardRevenue, 0));
                    const winRate = "winRate" in rep ? (rep as { winRate: number }).winRate : null;
                    const dealsCount = "dealsWon" in rep ? (rep as { dealsWon: number }).dealsWon : (rep as { deals: number }).deals;

                    return (
                      <motion.div
                        key={"repId" in rep ? `rep-${(rep as { repId: number }).repId}` : `rep-${rep.name}-${i}`}
                        className={cn(
                          "relative rounded-xl p-3 transition-colors",
                          isTop3
                            ? cn("border", style?.bg, style?.border, "ring-1", style?.ring)
                            : "border border-border/50 bg-muted/30",
                        )}
                        variants={slideInLeft}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "relative flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shrink-0",
                              isTop3
                                ? cn(style?.bg, style?.text)
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {isTop3 ? (
                              <>
                                <Medal className={cn("h-4 w-4", style?.text)} />
                                <span
                                  className={cn(
                                    "absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold",
                                    style?.badgeColor,
                                  )}
                                >
                                  {i + 1}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs">{i + 1}</span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                {getPersonSlug(rep.name) ? (
                                  <Link
                                    href={`/sales/person/${getPersonSlug(rep.name)}`}
                                    className={cn(
                                      "text-sm font-semibold truncate block transition-colors",
                                      isTop3
                                        ? cn(style?.text, "hover:opacity-80")
                                        : "text-foreground hover:text-gold",
                                    )}
                                  >
                                    {rep.name}
                                  </Link>
                                ) : (
                                  <p
                                    className={cn(
                                      "text-sm font-semibold truncate",
                                      isTop3 ? style?.text : "text-foreground",
                                    )}
                                  >
                                    {rep.name}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {dealsCount} deals closed
                                  {winRate !== null && (
                                    <> · <span className="text-emerald-500 font-medium">{winRate}% win</span></>
                                  )}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p
                                  className={cn(
                                    "text-sm font-bold tabular-nums",
                                    isTop3 ? style?.text : "text-foreground",
                                  )}
                                >
                                  {formatCurrency(rep.revenue)}
                                </p>
                              </div>
                            </div>
                            <div
                              className="mt-2 h-1.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden"
                              role="progressbar"
                              aria-valuenow={revenuePercent}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${rep.name} revenue progress`}
                            >
                              <motion.div
                                className={cn(
                                  "h-full rounded-full",
                                  style?.barColor ?? DEFAULT_BAR_COLOR,
                                )}
                                initial={{ width: 0 }}
                                animate={{ width: `${revenuePercent}%` }}
                                transition={{ duration: 0.6, delay: 0.4 + i * 0.08 }}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Card className="h-full shadow-noir">
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-y-auto pr-1 max-h-[380px]">
                  <ActivityFeed items={salesActivity} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div variants={fadeUp}>
          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base">Deals by Stage</CardTitle>
            </CardHeader>
            <CardContent>
              {dealsByStage.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No deals yet. Create your first deal to see stage breakdown.</p>
              ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                {dealsByStage.map((stage) => (
                  <motion.div
                    key={stage.stage}
                    className="relative overflow-hidden rounded-xl border border-border p-4"
                    variants={scaleIn}
                  >
                    <div
                      className="absolute inset-0 opacity-[0.04]"
                      style={{ backgroundColor: stage.color }}
                    />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="text-sm font-medium text-foreground">{stage.stage}</span>
                      </div>
                      <p className="text-xl font-bold text-foreground">{stage.count}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatCurrency(stage.value)} value
                      </p>
                      <div
                        className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden"
                        role="progressbar"
                        aria-valuenow={stage.count}
                        aria-valuemin={0}
                        aria-valuemax={maxDealsByStageCount}
                        aria-label={`${stage.stage} deal count`}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: stage.color }}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(stage.count / maxDealsByStageCount) * 100}%`,
                          }}
                          transition={{ duration: 0.6, delay: 0.5 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="grid gap-4 lg:grid-cols-2"
          variants={fadeUp}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-amber-500" />
                Deal Velocity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {velocityData?.dealCount === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No closed deals in this period.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Avg Days to Close</p>
                    <p className="text-2xl font-bold tabular-nums mt-0.5">
                      {velocityData?.avgDaysToClose ?? ""}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Median Days to Close</p>
                    <p className="text-2xl font-bold tabular-nums mt-0.5">
                      {velocityData?.medianDaysToClose ?? ""}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Fastest Close</p>
                    <p className="text-xl font-semibold tabular-nums mt-0.5 text-green-600 dark:text-green-400">
                      {velocityData?.fastestCloseDays ?? ""}d
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Slowest Close</p>
                    <p className="text-xl font-semibold tabular-nums mt-0.5 text-red-600 dark:text-red-400">
                      {velocityData?.slowestCloseDays ?? ""}d
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="h-4 w-4 text-primary" />
                Sales Cycle Length
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!cycleData || cycleData.totalDeals === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No closed deals yet.</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Avg Close</p>
                      <p className="text-xl font-semibold tabular-nums mt-0.5">{cycleData.avgDays ?? ""}d</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Median</p>
                      <p className="text-xl font-semibold tabular-nums mt-0.5">{cycleData.medianDays ?? ""}d</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {cycleData.histogram.map((b) => {
                      const maxCount = Math.max(...cycleData.histogram.map((x) => x.count), 1);
                      return (
                        <div key={b.label} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-14 shrink-0">{b.label}</span>
                          <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                            <div
                              className="h-full bg-primary/70 rounded transition-all"
                              style={{ width: `${(b.count / maxCount) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground w-6 text-right shrink-0">{b.count}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">{cycleData.totalDeals} won deals analysed</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserX className="h-4 w-4 text-destructive" />
                Lost Deal Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!lostData || lostData.total === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No lost deals.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span><strong className="text-foreground">{lostData.total}</strong> lost deals</span>
                    <span><strong className="text-foreground">{formatCurrency(lostData.totalValue)}</strong> lost value</span>
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {lostData.reasons.map((r) => (
                      <div key={r.reason} className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className="truncate text-muted-foreground max-w-[180px]">{r.reason}</span>
                          <span className="font-medium tabular-nums shrink-0">{r.count} ({r.pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded overflow-hidden">
                          <div className="h-full bg-destructive/60 rounded" style={{ width: `${r.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-destructive" />
                Stagnant Deals
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  Stagnant &gt;14 days
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(agingData?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No stagnant deals.
                </p>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {agingData?.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between rounded border border-destructive/20 bg-destructive/5 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium leading-tight">{deal.companyName}</p>
                        <p className="text-xs text-muted-foreground">{deal.stage}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-destructive">
                          {deal.daysSinceUpdate}d stagnant
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(deal.value)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
