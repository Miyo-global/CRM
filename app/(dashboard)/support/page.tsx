"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Ticket,
  Clock,
  Star,
  Zap,
  Shield,
  Gauge,
  MessageSquareReply,
  Inbox,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/charts/metric-card";
import { MiniAreaChart } from "@/components/charts/mini-area-chart";
import { MiniDonutChart } from "@/components/charts/mini-donut-chart";
import { ActivityFeed } from "@/components/charts/activity-feed";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { useSupportDashboard } from "@/lib/hooks/trpc-hooks";
import { staggerContainer, fadeUp, slideInLeft } from "@/lib/motion-variants";
import { safeMax, calcPercent } from "@/lib/format-utils";
import { getColorSafe, onlineStatusColors, sparkColors } from "@/lib/theme-constants";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

const formatTicketValue = (v: number) => v.toLocaleString();

export default function SupportDashboardPage() {
  const { data, isLoading } = useSupportDashboard();

  const ticketStatusBreakdown = data?.ticketStatusBreakdown ?? [];
  const ticketVolumeTimeline = data?.ticketVolumeTimeline ?? [];
  const supportActivityFeed = data?.supportActivityFeed ?? [];
  const supportTeamMembers = data?.supportTeamMembers ?? [];
  const ticketsByPriority = data?.ticketsByPriority ?? [];
  const slaCompliance = data?.slaCompliance;

  const totalTickets = useMemo(
    () => ticketStatusBreakdown.reduce((sum, s) => sum + s.value, 0),
    [ticketStatusBreakdown],
  );
  const totalPriority = useMemo(
    () => ticketsByPriority.reduce((sum, p) => sum + p.value, 0),
    [ticketsByPriority],
  );
  const maxPriorityValue = useMemo(
    () => safeMax(ticketsByPriority.map((p) => p.value)),
    [ticketsByPriority],
  );
  const hasVolume = useMemo(
    () => ticketVolumeTimeline.some((p) => p.value > 0),
    [ticketVolumeTimeline],
  );

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const { supportDashboardStats } = data;

  return (
    <PageWrapper
      title="Support Analytics"
      subtitle="Real-time insights into customer support performance across all channels"
    >
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >

      <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Open Tickets"
          value={supportDashboardStats.openTickets.value}
          icon={Ticket}
          trend={supportDashboardStats.openTickets.trend}
          sparkColor={sparkColors.blue}
        />
        <MetricCard
          label="Avg Resolution Time"
          value={supportDashboardStats.avgResolution.value}
          icon={Clock}
          trend={supportDashboardStats.avgResolution.trend}
          sparkColor={sparkColors.amber}
        />
        <MetricCard
          label="CSAT Score"
          value={supportDashboardStats.csatScore.value}
          icon={Star}
          trend={supportDashboardStats.csatScore.trend}
          sparkColor={sparkColors.green}
        />
        <MetricCard
          label="Response Rate"
          value={supportDashboardStats.responseRate.value}
          icon={Zap}
          trend={supportDashboardStats.responseRate.trend}
          sparkColor={sparkColors.purple}
        />
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">
        <motion.div className="lg:col-span-5" variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-gold" />
                Ticket Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-4">
              {totalTickets > 0 ? (
                <MiniDonutChart
                  data={ticketStatusBreakdown}
                  centerValue={totalTickets}
                  centerLabel="Total"
                />
              ) : (
                <EmptyState
                  compact
                  icon={Inbox}
                  title="No tickets yet"
                  description="Ticket status will appear here once your team starts receiving support requests."
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="lg:col-span-7" variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Ticket className="h-4 w-4 text-gold" />
                Ticket Volume Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasVolume ? (
                <MiniAreaChart
                  data={ticketVolumeTimeline}
                  color={sparkColors.blue}
                  height={240}
                  formatValue={formatTicketValue}
                />
              ) : (
                <EmptyState
                  compact
                  icon={Ticket}
                  title="No ticket volume yet"
                  description="Monthly ticket trends populate as tickets are created over time."
                  className="h-[240px] justify-center"
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">
        <motion.div className="lg:col-span-5" variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Gauge className="h-4 w-4 text-gold" />
                SLA Compliance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {slaCompliance && slaCompliance.totalTickets > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center py-2">
                    <MiniDonutChart
                      data={[
                        { label: "Within SLA", value: slaCompliance.withinSla, color: "#10B981" },
                        { label: "Breached", value: slaCompliance.breached, color: "#EF4444" },
                      ]}
                      centerValue={`${slaCompliance.compliancePct}%`}
                      centerLabel="On-time"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-xs text-muted-foreground">Within SLA</p>
                      <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {slaCompliance.withinSla}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-xs text-muted-foreground">Breached</p>
                      <p className="text-lg font-semibold text-red-600 dark:text-red-400 tabular-nums">
                        {slaCompliance.breached}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={Gauge}
                  title="No SLA data yet"
                  description="SLA compliance is tracked against priority-based targets once tickets exist."
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="lg:col-span-7" variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquareReply className="h-4 w-4 text-gold" />
                Response &amp; Resolution SLA by Priority
              </CardTitle>
            </CardHeader>
            <CardContent>
              {slaCompliance && slaCompliance.totalTickets > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Response Rate</p>
                      <p className="text-sm text-muted-foreground/80">
                        {slaCompliance.respondedTickets} of {slaCompliance.totalTickets} tickets answered
                      </p>
                    </div>
                    <span className="text-2xl font-bold tabular-nums text-foreground">
                      {slaCompliance.responseRate}%
                    </span>
                  </div>
                  <table className="w-full text-sm">
                    <caption className="sr-only">Average resolution time versus SLA target by ticket priority</caption>
                    <thead>
                      <tr className="border-b border-border">
                        <th scope="col" className="text-left font-medium text-muted-foreground pb-2">Priority</th>
                        <th scope="col" className="text-right font-medium text-muted-foreground pb-2">Tickets</th>
                        <th scope="col" className="text-right font-medium text-muted-foreground pb-2">Avg Resolve</th>
                        <th scope="col" className="text-right font-medium text-muted-foreground pb-2">Target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slaCompliance.byPriority.map((row) => {
                        const overTarget =
                          row.avgResolutionHours > 0 && row.avgResolutionHours > row.slaTargetHours;
                        return (
                          <tr key={row.priority} className="border-b border-border/50 last:border-0">
                            <td className="py-2.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: row.color }}
                                />
                                <span className="font-medium text-foreground">{row.priority}</span>
                              </div>
                            </td>
                            <td className="py-2.5 text-right tabular-nums text-muted-foreground">{row.total}</td>
                            <td
                              className={cn(
                                "py-2.5 text-right tabular-nums font-medium",
                                overTarget ? "text-red-600 dark:text-red-400" : "text-foreground",
                              )}
                            >
                              {row.avgResolutionHours > 0 ? `${row.avgResolutionHours}h` : ""}
                            </td>
                            <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                              {row.slaTargetHours}h
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={MessageSquareReply}
                  title="No response data yet"
                  description="Response rate and per-priority resolution times appear once tickets are handled."
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <motion.div variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-y-auto pr-1 max-h-[380px]">
                {supportActivityFeed.length > 0 ? (
                  <ActivityFeed items={supportActivityFeed} />
                ) : (
                  <EmptyState
                    compact
                    icon={Inbox}
                    title="No recent activity"
                    description="Ticket events like new requests, replies, and resolutions will show up here."
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="lg:col-span-2" variants={fadeUp}>
          <Card className="h-full shadow-noir">
            <CardHeader>
              <CardTitle className="text-base">Team Access</CardTitle>
            </CardHeader>
            <CardContent>
              {supportTeamMembers.length === 0 ? (
                <EmptyState
                  compact
                  icon={Shield}
                  title="No support team members"
                  description="Add team members to manage support coverage and access levels."
                />
              ) : (
              <ScrollArea className="w-full max-h-[60vh]" type="auto">
              <div className="min-w-[400px]">
                <table className="w-full text-sm">
                  <caption className="sr-only">Support team members with roles, access levels, and online status</caption>
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className="text-left font-medium text-muted-foreground pb-2">Name</th>
                      <th scope="col" className="text-left font-medium text-muted-foreground pb-2">Role</th>
                      <th scope="col" className="text-left font-medium text-muted-foreground pb-2">Access</th>
                      <th scope="col" className="text-left font-medium text-muted-foreground pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supportTeamMembers.map((member, idx) => (
                      <motion.tr
                        key={`member-${idx}`}
                        className="border-b border-border/50 last:border-0"
                        variants={fadeUp}
                      >
                        <td className="py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-semibold text-gold">
                                {member.avatar}
                              </span>
                            </div>
                            <span className="font-medium text-foreground">{member.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-muted-foreground">{member.role}</td>
                        <td className="py-2.5">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {member.access}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div
                              className={cn(
                                "w-2 h-2 rounded-full",
                                getColorSafe(onlineStatusColors, member.status)
                              )}
                            />
                            <span className="text-xs capitalize text-muted-foreground">
                              {member.status}
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={fadeUp}>
        <Card className="shadow-noir">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-gold" />
              Tickets by Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalPriority === 0 ? (
              <EmptyState
                compact
                icon={Shield}
                title="No tickets to prioritize"
                description="Priority distribution appears once tickets are created."
              />
            ) : (
            <div className="space-y-4">
              {ticketsByPriority.map((priority) => {
                const percentage = calcPercent(priority.value, totalPriority);

                return (
                  <motion.div
                    key={priority.label}
                    className="relative overflow-hidden rounded-xl border border-border p-4"
                    variants={slideInLeft}
                  >
                    <div
                      className="absolute inset-0 opacity-[0.04]"
                      style={{ backgroundColor: priority.color }}
                    />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: priority.color }}
                          />
                          <span className="text-sm font-medium text-foreground">
                            {priority.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-foreground">
                            {priority.value}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: priority.color }}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(priority.value / maxPriorityValue) * 100}%`,
                          }}
                          transition={{ duration: 0.6, delay: 0.4 }}
                        />
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
    </motion.div>
    </PageWrapper>
  );
}
