"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Users,
  ThumbsUp,
  Star,
  ShieldCheck,
  HeadphonesIcon,
  Zap,
  SmilePlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/charts/metric-card";
import { MiniDonutChart } from "@/components/charts/mini-donut-chart";
import { MiniAreaChart } from "@/components/charts/mini-area-chart";
import { ActivityFeed } from "@/components/charts/activity-feed";
import { useCustomerExecutiveDashboard, useCrmPeopleSlugs } from "@/lib/hooks/trpc-hooks";
import { formatCurrency } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import { getColorSafe, healthStatusColors, healthDotColors } from "@/lib/theme-constants";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function CustomerExecutiveDashboardPage() {
  const { data: session } = useSession();
  const isCSRep = session?.user?.role === "CUSTOMER_SUPPORT";
  const { data, isLoading } = useCustomerExecutiveDashboard();
  const { data: slugMap } = useCrmPeopleSlugs();

  const getPersonSlug = (name: string) => slugMap?.[name] ?? null;

  if (isLoading || !data) {
    return (
      <PageWrapper title="Dashboard" subtitle="Loading...">
        <div className="space-y-6">
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
          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-5">
              <CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
              <CardContent className="flex items-center justify-center py-4">
                <Skeleton className="h-48 w-48 rounded-full" />
              </CardContent>
            </Card>
            <Card className="lg:col-span-7">
              <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const {
    customerStats,
    clientHealth,
    upcomingRenewals,
    keyAccounts,
    customerInteractions,
    supportStats,
    retentionTimeline,
    csatTimeline,
  } = data;

  return (
    <PageWrapper
      title={isCSRep ? "My Support Hub" : "Customer Executive Dashboard"}
      subtitle={isCSRep ? "Your client health, tickets, and satisfaction metrics" : "Client health, retention, and satisfaction overview"}
    >
      <div className="space-y-4 pb-2">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Clients"
          value={customerStats.totalClients.value}
          icon={Users}
          trend={customerStats.totalClients.trend}
          sparkColor="#3B82F6"
        />
        <MetricCard
          label="NPS Score"
          value={customerStats.nps.value}
          icon={ThumbsUp}
          trend={customerStats.nps.trend}
          sparkColor="#10B981"
        />
        <MetricCard
          label="CSAT Score"
          value={`${customerStats.csat.value}/5`}
          icon={Star}
          trend={customerStats.csat.trend}
          sparkData={csatTimeline.map((d) => d.value)}
          sparkColor="#F59E0B"
        />
        <MetricCard
          label="Retention Rate"
          value={`${customerStats.retention.value}%`}
          icon={ShieldCheck}
          trend={customerStats.retention.trend}
          sparkData={retentionTimeline.map((d) => d.value)}
          sparkColor="#8B5CF6"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <motion.div
          className="lg:col-span-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Client Health</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-4">
              <MiniDonutChart
                data={clientHealth}
                centerValue={clientHealth.reduce((s, d) => s + d.value, 0)}
                centerLabel="Total"
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="lg:col-span-7"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Upcoming Renewals</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full max-h-[60vh]" type="auto">
              <div className="min-w-[400px]">
                <table className="w-full text-sm">
                  <caption className="sr-only">Upcoming client renewals</caption>
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left font-medium text-muted-foreground pb-2">Client</th>
                      <th className="text-left font-medium text-muted-foreground pb-2">Value</th>
                      <th className="text-left font-medium text-muted-foreground pb-2">Date</th>
                      <th className="text-left font-medium text-muted-foreground pb-2">Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingRenewals.map((r, i) => (
                      <motion.tr
                        key={i}
                        className="border-b border-border/50 last:border-0"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 + i * 0.05 }}
                      >
                        <td className="py-2.5 font-medium text-foreground">{r.client}</td>
                        <td className="py-2.5 text-foreground">{formatCurrency(r.value)}</td>
                        <td className="py-2.5 text-muted-foreground">{r.date}</td>
                        <td className="py-2.5">
                          <span
                            className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                              getColorSafe(healthStatusColors, r.health)
                            )}
                          >
                            {r.health.replace("_", " ")}
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
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Key Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {keyAccounts.map((account, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0"
                  >
                    <div className={cn("w-2 h-2 rounded-full shrink-0", getColorSafe(healthDotColors, account.health))} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{account.name}</p>
                      <p className="text-xs text-muted-foreground">
                        CSM:{" "}
                        {getPersonSlug(account.csm) ? (
                          <Link
                            href={`/sales/person/${getPersonSlug(account.csm)}`}
                            className="text-primary hover:underline"
                          >
                            {account.csm}
                          </Link>
                        ) : (
                          account.csm
                        )}
                        {" "}· Since {account.since}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(account.revenue)}
                      </p>
                      <span
                        className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize",
                          getColorSafe(healthStatusColors, account.health)
                        )}
                      >
                        {account.health.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Recent Interactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-y-auto pr-1" style={{ maxHeight: "380px" }}>
                <ActivityFeed items={customerInteractions} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <HeadphonesIcon className="h-4 w-4 text-primary" />
                Support Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border p-2.5 text-center">
                  <p className="text-2xl font-bold text-foreground">{supportStats.openTickets}</p>
                  <p className="text-xs text-muted-foreground mt-1">Open Tickets</p>
                </div>
                <div className="rounded-xl border border-border p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{supportStats.avgResolution}</p>
                  <p className="text-xs text-muted-foreground mt-1">Avg Resolution</p>
                </div>
                <div className="rounded-xl border border-border p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <p className="text-2xl font-bold text-foreground">{supportStats.firstResponse}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">First Response</p>
                </div>
                <div className="rounded-xl border border-border p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <SmilePlus className="h-4 w-4 text-emerald-500" />
                    <p className="text-2xl font-bold text-foreground">{supportStats.satisfaction}%</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Satisfaction</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Retention Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MiniAreaChart
                data={retentionTimeline}
                color="#8B5CF6"
                height={180}
                formatValue={(v) => `${v}%`}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                CSAT Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MiniAreaChart
                data={csatTimeline}
                color="#F59E0B"
                height={180}
                formatValue={(v) => v.toFixed(1)}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
      </div>
    </PageWrapper>
  );
}
