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
  Activity,
  Users,
} from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WidgetCard } from "@/components/dashboard/widgets/widget-card";
import { StatsStrip } from "@/components/shared/stats-strip";
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
import { getRoleLabel } from "@/lib/rbac/roles";

const formatTicketValue = (v: number) => v.toLocaleString();

export default function SupportDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useSupportDashboard();

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

  if (isError && !data) {
    return (
      <PageWrapper
        title="Support analytics"
      >
        <QueryErrorState error={error} onRetry={() => void refetch()} />
      </PageWrapper>
    );
  }

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
      title="Support analytics"
    >
    <motion.div
      className="grid grid-cols-12 gap-4 xl:gap-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >

      <motion.div variants={fadeUp} className="col-span-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
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

      <motion.div className="col-span-12 lg:col-span-5" variants={fadeUp}>
        <WidgetCard title="Ticket status breakdown" icon={Shield}>
          <div className="flex items-center justify-center py-4">
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
          </div>
        </WidgetCard>
      </motion.div>

      <motion.div className="col-span-12 lg:col-span-7" variants={fadeUp}>
        <WidgetCard title="Ticket volume trend" icon={Ticket} tone="info">
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
              className="h-60 justify-center"
            />
          )}
        </WidgetCard>
      </motion.div>

      <motion.div className="col-span-12 lg:col-span-5" variants={fadeUp}>
        <WidgetCard title="SLA compliance" icon={Gauge} tone="success">
          {slaCompliance && slaCompliance.totalTickets > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-2">
                <MiniDonutChart
                  data={[
                    { label: "Within SLA", value: slaCompliance.withinSla, color: "var(--chart-7)" },
                    { label: "Breached", value: slaCompliance.breached, color: "var(--chart-8)" },
                  ]}
                  centerValue={`${slaCompliance.compliancePct}%`}
                  centerLabel="On-time"
                />
              </div>
              <StatsStrip
                className="shadow-none"
                items={[
                  { label: "Within SLA", value: slaCompliance.withinSla, tone: "success" },
                  { label: "Breached", value: slaCompliance.breached, tone: "danger" },
                ]}
              />
            </div>
          ) : (
            <EmptyState
              compact
              icon={Gauge}
              title="No SLA data yet"
              description="SLA compliance is tracked against priority-based targets once tickets exist."
            />
          )}
        </WidgetCard>
      </motion.div>

      <motion.div className="col-span-12 lg:col-span-7" variants={fadeUp}>
        <WidgetCard title="Response & resolution SLA by priority" icon={MessageSquareReply} tone="plum">
          {slaCompliance && slaCompliance.totalTickets > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-sunken p-3">
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Response Rate</p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {slaCompliance.respondedTickets} of {slaCompliance.totalTickets} tickets answered
                  </p>
                </div>
                <span className="font-display text-3xl font-extrabold tabular-nums text-foreground">
                  {slaCompliance.responseRate}%
                </span>
              </div>
              <Table>
                <caption className="sr-only">Average resolution time versus SLA target by ticket priority</caption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Priority</TableHead>
                    <TableHead scope="col" className="text-right">Tickets</TableHead>
                    <TableHead scope="col" className="text-right">Avg Resolve</TableHead>
                    <TableHead scope="col" className="text-right">Target</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slaCompliance.byPriority.map((row) => {
                    const overTarget =
                      row.avgResolutionHours > 0 && row.avgResolutionHours > row.slaTargetHours;
                    return (
                      <TableRow key={row.priority}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2.5 rounded-full"
                              style={{ backgroundColor: row.color }}
                              aria-hidden
                            />
                            <span className="font-medium text-foreground">{row.priority}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{row.total}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums font-medium",
                            overTarget ? "text-danger-strong" : "text-foreground",
                          )}
                        >
                          {row.avgResolutionHours > 0 ? `${row.avgResolutionHours}h` : ""}
                          {overTarget && <span className="sr-only"> (over target)</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {row.slaTargetHours}h
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              compact
              icon={MessageSquareReply}
              title="No response data yet"
              description="Response rate and per-priority resolution times appear once tickets are handled."
            />
          )}
        </WidgetCard>
      </motion.div>

      <motion.div className="col-span-12 lg:col-span-4" variants={fadeUp}>
        <WidgetCard title="Recent activity" icon={Activity} tone="neutral">
          <div className="max-h-96 overflow-y-auto pr-1">
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
        </WidgetCard>
      </motion.div>

      <motion.div className="col-span-12 lg:col-span-8" variants={fadeUp}>
        <WidgetCard title="Team access" icon={Users} tone="teal" count={supportTeamMembers.length || undefined}>
          {supportTeamMembers.length === 0 ? (
            <EmptyState
              compact
              icon={Shield}
              title="No support team members"
              description="Add team members to manage support coverage and access levels."
            />
          ) : (
            <Table className="min-w-100">
              <caption className="sr-only">Support team members with roles, access levels, and online status</caption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Name</TableHead>
                  <TableHead scope="col">Role</TableHead>
                  <TableHead scope="col">Access</TableHead>
                  <TableHead scope="col">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supportTeamMembers.map((member, idx) => (
                  <TableRow key={`member-${idx}`}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-soft-foreground">
                          {member.avatar}
                        </span>
                        <span className="font-medium text-foreground">{member.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{getRoleLabel(member.role)}</TableCell>
                    <TableCell>
                      <StatusPill tone="neutral">{member.access}</StatusPill>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            getColorSafe(onlineStatusColors, member.status)
                          )}
                          aria-hidden
                        />
                        <span className="text-xs capitalize text-muted-foreground">
                          {member.status}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </WidgetCard>
      </motion.div>

      <motion.div className="col-span-12" variants={fadeUp}>
        <WidgetCard title="Tickets by priority" icon={Shield} tone="warning">
          {totalPriority === 0 ? (
            <EmptyState
              compact
              icon={Shield}
              title="No tickets to prioritize"
              description="Priority distribution appears once tickets are created."
            />
          ) : (
          <div className="space-y-3">
            {ticketsByPriority.map((priority) => {
              const percentage = calcPercent(priority.value, totalPriority);

              return (
                <motion.div
                  key={priority.label}
                  className="rounded-lg border border-border p-3"
                  variants={slideInLeft}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: priority.color }}
                        aria-hidden
                      />
                      <span className="text-sm font-medium text-foreground">
                        {priority.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 tabular-nums">
                      <span className="text-sm font-semibold text-foreground">
                        {priority.value}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
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
                </motion.div>
              );
            })}
          </div>
          )}
        </WidgetCard>
      </motion.div>
    </motion.div>
    </PageWrapper>
  );
}
