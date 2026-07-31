"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Megaphone,
  UserPlus,
  Target,
  TrendingUp,
  Play,
  Pause,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/charts/metric-card";
import { MiniAreaChart } from "@/components/charts/mini-area-chart";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { MiniDonutChart } from "@/components/charts/mini-donut-chart";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useMarketingDashboard } from "@/lib/hooks/trpc-hooks";
import { formatCurrency, formatNumber } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { staggerContainer, fadeUp, slideInLeft } from "@/lib/motion-variants";
import {
  campaignStatusConfig,
  isCampaignStatus,
  getColorSafe,
  eventStatusColors,
  sparkColors,
} from "@/lib/theme-constants";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

const ROI_HIGH_THRESHOLD = 4;
const ROI_MED_THRESHOLD = 2.5;
const CONV_HIGH_THRESHOLD = 5;

const statusIcons: Record<string, React.ElementType> = {
  active: Play,
  paused: Pause,
  completed: CheckCircle2,
};

const formatMqlValue = (v: number) => v.toLocaleString();

export default function MarketingDashboardPage() {
  const { data: session } = useSession();
  const isDM = session?.user?.role === "DIGITAL_MARKETING";
  const { data, isLoading } = useMarketingDashboard();

  const marketingStats = data?.marketingStats;
  const mqlTimeline = data?.mqlTimeline ?? [];
  const leadFunnel = data?.leadFunnel ?? [];
  const campaigns = data?.campaigns ?? [];
  const channelBreakdown = data?.channelBreakdown ?? [];
  const contentPerformance = data?.contentPerformance ?? [];
  const upcomingEvents = data?.upcomingEvents ?? [];

  const mqlSparkData = useMemo(() => mqlTimeline.map((d) => d.value), [mqlTimeline]);

  if (isLoading || !marketingStats) {
    return (
      <PageWrapper
        title={isDM ? "My Marketing Hub" : "Marketing Dashboard"}
        subtitle={isDM ? "Your campaigns, lead generation, and marketing ROI" : "Campaign performance, lead generation, and marketing ROI"}
      >
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-80" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={isDM ? "My Marketing Hub" : "Marketing Dashboard"}
      subtitle={isDM ? "Your campaigns, lead generation, and marketing ROI" : "Campaign performance, lead generation, and marketing ROI"}
    >
      <motion.div
        className="space-y-4 pb-2"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp} className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Active Campaigns"
            value={marketingStats.campaigns.value}
            icon={Megaphone}
            trend={marketingStats.campaigns.trend}
            sparkColor={sparkColors.blue}
          />
          <MetricCard
            label="Total Leads"
            value={formatNumber(marketingStats.leads.value)}
            icon={UserPlus}
            trend={marketingStats.leads.trend}
            sparkColor={sparkColors.green}
          />
          <MetricCard
            label="MQLs"
            value={formatNumber(marketingStats.mqls.value)}
            icon={Target}
            trend={marketingStats.mqls.trend}
            sparkData={mqlSparkData}
            sparkColor={sparkColors.purple}
          />
          <MetricCard
            label="Overall ROI"
            value={`${marketingStats.roi.value}%`}
            icon={TrendingUp}
            trend={marketingStats.roi.trend}
            sparkColor={sparkColors.amber}
          />
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          <motion.div className="lg:col-span-7" variants={fadeUp}>
            <Card className="h-full shadow-noir">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gold" />
                  MQL Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MiniAreaChart
                  data={mqlTimeline}
                  color={sparkColors.purple}
                  height={240}
                  formatValue={formatMqlValue}
                />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div className="lg:col-span-5" variants={fadeUp}>
            <Card className="h-full shadow-noir">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-gold" />
                  Lead Gen Funnel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FunnelChart data={leadFunnel} />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          <motion.div className="lg:col-span-7" variants={fadeUp}>
            <Card className="h-full shadow-noir">
              <CardHeader>
                <CardTitle className="text-base">Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full max-h-[60vh]" type="auto">
                <div className="min-w-[500px]">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Marketing campaigns with status, leads, spend, and ROI</caption>
                    <thead>
                      <tr className="border-b border-border">
                        <th scope="col" className="text-left font-medium text-muted-foreground pb-2">Campaign</th>
                        <th scope="col" className="text-left font-medium text-muted-foreground pb-2">Status</th>
                        <th scope="col" className="text-right font-medium text-muted-foreground pb-2">Leads</th>
                        <th scope="col" className="text-right font-medium text-muted-foreground pb-2">Spend</th>
                        <th scope="col" className="text-right font-medium text-muted-foreground pb-2">ROI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((c, idx) => {
                        const config = isCampaignStatus(c.status)
                          ? campaignStatusConfig[c.status]
                          : campaignStatusConfig.active;
                        const StatusIcon = statusIcons[c.status] ?? Play;
                        return (
                          <motion.tr
                            key={`campaign-${idx}`}
                            className="border-b border-border/50 last:border-0"
                            variants={fadeUp}
                          >
                            <td className="py-2.5 font-medium text-foreground">{c.name}</td>
                            <td className="py-2.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                                  config.bg,
                                  config.color
                                )}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {c.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right text-foreground">{formatNumber(c.leads)}</td>
                            <td className="py-2.5 text-right text-muted-foreground">
                              {formatCurrency(c.spend)}
                            </td>
                            <td className="py-2.5 text-right">
                              <span
                                className={cn(
                                  "font-semibold",
                                  c.roi >= ROI_HIGH_THRESHOLD
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : c.roi >= ROI_MED_THRESHOLD
                                    ? "text-foreground"
                                    : "text-amber-600 dark:text-amber-400"
                                )}
                              >
                                {c.roi}x
                              </span>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div className="lg:col-span-5" variants={fadeUp}>
            <Card className="h-full shadow-noir">
              <CardHeader>
                <CardTitle className="text-base">Channel Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-4">
                <MiniDonutChart
                  data={channelBreakdown}
                  centerValue="100%"
                  centerLabel="Traffic"
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          <motion.div variants={fadeUp}>
            <Card className="h-full shadow-noir">
              <CardHeader>
                <CardTitle className="text-base">Content Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full max-h-[60vh]" type="auto">
                <div className="min-w-[500px]">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Content performance with views, leads, and conversion rates</caption>
                    <thead>
                      <tr className="border-b border-border">
                        <th scope="col" className="text-left font-medium text-muted-foreground pb-2">Content</th>
                        <th scope="col" className="text-left font-medium text-muted-foreground pb-2">Type</th>
                        <th scope="col" className="text-right font-medium text-muted-foreground pb-2">Views</th>
                        <th scope="col" className="text-right font-medium text-muted-foreground pb-2">Leads</th>
                        <th scope="col" className="text-right font-medium text-muted-foreground pb-2">Conv%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contentPerformance.map((c, idx) => (
                        <motion.tr
                          key={`content-${idx}`}
                          className="border-b border-border/50 last:border-0"
                          variants={fadeUp}
                        >
                          <td className="py-2.5 font-medium text-foreground max-w-[180px] truncate" title={c.title}>
                            {c.title}
                          </td>
                          <td className="py-2.5">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {c.type}
                            </span>
                          </td>
                          <td className="py-2.5 text-right text-foreground">
                            {formatNumber(c.views)}
                          </td>
                          <td className="py-2.5 text-right text-foreground">{c.leads}</td>
                          <td className="py-2.5 text-right">
                            <span
                              className={cn(
                                "font-semibold",
                                c.convRate >= CONV_HIGH_THRESHOLD
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-foreground"
                              )}
                            >
                              {c.convRate}%
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Card className="h-full shadow-noir">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gold" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingEvents.map((event, idx) => (
                    <motion.div
                      key={`event-${idx}`}
                      className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0"
                      variants={slideInLeft}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4 text-gold" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{event.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{event.date}</span>
                          <span className="text-xs text-muted-foreground/50">&middot;</span>
                          <span className="text-xs text-muted-foreground">{event.type}</span>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0",
                          getColorSafe(eventStatusColors, event.status)
                        )}
                      >
                        {event.status}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </PageWrapper>
  );
}
