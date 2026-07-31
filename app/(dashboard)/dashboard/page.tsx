"use client";

import { useMemo, useCallback, useEffect, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  useDashboardStats,
  useRecentProjects,
  useTeamAvailability,
  useActiveSprintSummary,
  useRecentActivity,
  useRoleStats,
  useTodayActivities,
} from "@/lib/api/hooks/dashboard";
import { useMyIssues } from "@/lib/api/hooks/dashboard";
import {
  useNotifications,
  useUnreadNotificationCount,
} from "@/lib/api/hooks/notifications";
import {
  Users,
  Briefcase,
  CalendarCheck,
  Building2,
  RefreshCw,
  Contact2,
  Ticket,
  Target,
  TrendingUp,
  CheckCircle2,
  ListChecks,
  Zap,
} from "lucide-react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClockInWidget } from "@/components/attendance/clock-in-widget";
import { DashboardStatsSkeleton } from "@/components/ui/dashboard-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import { getGreeting, getFirstName } from "@/lib/format-utils";
import { QuickActions, getQuickActionsForRole } from "@/features/dashboard/quick-actions";
import { SprintCard } from "@/features/dashboard/sprint-card";
import { TeamCard } from "@/features/dashboard/team-card";
import { MyIssuesCard, type DashboardTicket } from "@/features/dashboard/my-issues-card";
import { RecentProjectsCard } from "@/features/dashboard/recent-projects-card";
import { RecentActivityCard } from "@/features/dashboard/recent-activity-card";
import { MyTasksWidget } from "@/components/dashboard/widgets/my-tasks-widget";
import { LeaveBalanceWidget as LeaveBalanceWidgetNew } from "@/components/dashboard/widgets/leave-balance-widget";
import { TeamAttendanceWidget as TeamAttendanceWidgetNew } from "@/components/dashboard/widgets/team-attendance-widget";
import { UpcomingLeavesWidget } from "@/components/dashboard/widgets/upcoming-leaves-widget";
import { PendingApprovalsWidget as PendingApprovalsWidgetNew } from "@/components/dashboard/widgets/pending-approvals-widget";
import { QuickActionsWidget } from "@/components/dashboard/widgets/quick-actions-widget";
import { AnnouncementsWidget } from "@/components/dashboard/widgets/announcements-widget";
import { WidgetSkeleton } from "@/components/dashboard/widgets/widget-skeleton";
import { CeoAdminSection } from "@/features/dashboard/ceo-admin-section";
import { HrHomeSection } from "@/features/dashboard/hr-home-section";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const firstName = getFirstName(session);
  const role = session?.user?.role;
  const isCeo = role === "CEO";
  const isHrAdmin = role === "HR" || role === "ADMIN";
  const isAdmin = isCeo || isHrAdmin;
  const isManager = role === "BRANCH_MANAGER" || role === "BRANCH_HR";
  const isEmployee = !isAdmin && !isManager;

  const { data: stats, isLoading, error, refetch } = useDashboardStats({
    retry: 2,
    retryDelay: 1000,
  });

  const { data: recentProjects, isLoading: projectsLoading, error: projectsError } = useRecentProjects();
  const { data: teamAvailability, isLoading: teamLoading } = useTeamAvailability();
  const { data: recentActivity, isLoading: activityLoading, error: activityError } = useRecentActivity();

  const { data: myIssuesData, isLoading: ticketsLoading, error: ticketsError } = useMyIssues(
    currentUserId ?? "",
  );

  const { data: sprintSummary, isLoading: sprintLoading } = useActiveSprintSummary();

  const { data: roleStats } = useRoleStats();
  const { data: todayActivities } = useTodayActivities();

  const prevUnreadRef = useRef<number | null>(null);
  const { data: unreadData } = useUnreadNotificationCount({
    refetchInterval: 15000,
  });
  const { data: latestNotifications } = useNotifications(true, 5, {
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (unreadData === undefined) return;
    const currentCount = unreadData.count ?? 0;
    if (prevUnreadRef.current !== null && currentCount > prevUnreadRef.current && latestNotifications) {
      const newOnes = latestNotifications.slice(0, currentCount - prevUnreadRef.current);
      for (const n of newOnes) {
        toast(n.title, { description: n.message ?? undefined, duration: 5000 });
      }
    }
    prevUnreadRef.current = currentCount;
  }, [unreadData, latestNotifications]);

  const shownMeetingToastRef = useRef(false);
  useEffect(() => {
    if (todayActivities && todayActivities.length > 0 && !shownMeetingToastRef.current) {
      shownMeetingToastRef.current = true;
      if (todayActivities.length === 1) {
        const a = todayActivities[0];
        toast.info(`You have a scheduled ${a.type} today: ${a.subject || "No subject"}`, { duration: 6000 });
      } else {
        toast.info(`You have ${todayActivities.length} scheduled meetings/calls today`, { duration: 6000 });
      }
    }
  }, [todayActivities]);

  const greeting = useMemo(() => getGreeting(), []);
  const todayFormatted = useMemo(() => format(new Date(), "EEEE, MMMM do, yyyy"), []);

  const handleGoToDashboard = useCallback(() => router.push("/dashboard"), [router]);
  const handleGoToProjects = useCallback(() => router.push("/projects"), [router]);

  const statCards = useMemo(() => {
    if (!stats) return [];
    const rs = roleStats as Record<string, number> | undefined;

    switch (role) {
      case "CEO":
        return [
          { id: "present", label: "Present Today", value: stats.presentToday, icon: CalendarCheck, href: "/hr/attendance" },
          { id: "org", label: "Organization", value: stats.orgName, icon: Building2 },
        ];
      case "HR":
        return [
          { id: "employees", label: "Total Employees", value: stats.totalEmployees, icon: Users, href: "/hr" },
          { id: "present", label: "Present Today", value: stats.presentToday, icon: CalendarCheck, href: "/hr/attendance" },
          { id: "org", label: "Organization", value: stats.orgName, icon: Building2 },
        ];
      case "SALES":
        return [
          { id: "leads", label: "My Leads", value: rs?.myLeads ?? 0, icon: Contact2, href: "/crm/leads" },
          { id: "converted", label: "Converted", value: rs?.myConverted ?? 0, icon: TrendingUp, href: "/crm/leads" },
          { id: "deals", label: "My Deals", value: rs?.myDeals ?? 0, icon: Zap, href: "/crm/deals" },
          { id: "target", label: "Target Progress", value: `${rs?.targetProgress ?? 0}%`, icon: Target, href: "/crm/targets" },
        ];
      case "CUSTOMER_SUPPORT":
        return [
          { id: "projects", label: "My Projects", value: rs?.myProjects ?? 0, icon: Briefcase, href: "/projects" },
          { id: "tickets", label: "My Tickets", value: rs?.myTickets ?? 0, icon: Ticket },
          { id: "done", label: "Completed", value: rs?.myTicketsDone ?? 0, icon: CheckCircle2 },
          { id: "inprogress", label: "In Progress", value: rs?.myTicketsInProgress ?? 0, icon: ListChecks },
        ];
      case "ENGINEERING":
      case "DESIGN":
      case "VIDEO_EDITOR":
      case "DIGITAL_MARKETING":
        return [
          { id: "projects", label: "My Projects", value: rs?.myProjects ?? 0, icon: Briefcase, href: "/projects" },
          { id: "tickets", label: "My Tasks", value: rs?.myTickets ?? 0, icon: ListChecks },
          { id: "done", label: "Completed", value: rs?.myTicketsDone ?? 0, icon: CheckCircle2 },
          { id: "inprogress", label: "In Progress", value: rs?.myTicketsInProgress ?? 0, icon: Zap },
        ];
      default:
        return [
          { id: "org", label: "Organization", value: stats.orgName, icon: Building2 },
        ];
    }
  }, [stats, role, roleStats]);

  const sortedMyTickets = useMemo((): DashboardTicket[] => {
    const raw = myIssuesData ?? [];
    const toDashboardTicket = (t: (typeof raw)[number]): DashboardTicket => ({
      id: t.id,
      type: t.type,
      status: t.status,
      ticketNumber: t.ticketNumber,
      title: t.title,
      priority: t.priority,
      project: t.projectId != null
        ? { id: t.projectId, name: t.projectName, key: t.projectKey }
        : null,
    });
    const inProgress = raw.filter((t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW");
    const todo = raw.filter((t) => t.status === "TODO" || t.status === "BACKLOG");
    return [...inProgress, ...todo].map(toDashboardTicket);
  }, [myIssuesData]);

  if (isLoading) {
    const quickActionsList = getQuickActionsForRole(role);
    const quickActionsGridClass =
      `grid grid-cols-2 gap-3 sm:grid-cols-3 ${quickActionsList.length >= 5 ? "md:grid-cols-5" : quickActionsList.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`;

    return (
      <PageWrapper
        title="Dashboard"
        subtitle="Loading your workspace..."
        actions={<Skeleton className="h-10 w-32 rounded-md" />}
      >
        <div className="space-y-5" role="status" aria-live="polite" aria-label="Loading dashboard">
          <DashboardStatsSkeleton />
          {quickActionsList.length > 0 ? (
            <div className={quickActionsGridClass}>
              {quickActionsList.map((a) => (
                <div key={a.label} className="rounded-xl border border-border bg-card p-4 shadow-noir">
                  <div className="flex flex-col items-center gap-2">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`kpi-${i}`} className="rounded-xl border border-border bg-card p-4 shadow-noir">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-9 w-9 rounded-lg" />
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            <WidgetSkeleton rows={4} />
            <WidgetSkeleton rows={3} />
            <WidgetSkeleton rows={4} />
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`mini-${i}`} className="rounded-xl border border-border bg-card p-4 shadow-noir">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <div className="space-y-8" role="alert">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error instanceof Error ? error.message : "Failed to load dashboard stats"}</span>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-8">
        <EmptyState
          illustration={<EmptyActivityIllustration className="h-40 w-40" />}
          title="No data available"
          description="Dashboard statistics are not available. Please try refreshing."
          action={{
            label: "Refresh",
            onClick: handleGoToDashboard,
          }}
        />
      </div>
    );
  }

  return (
    <PageWrapper
      title={`${greeting}, ${firstName}`}
      subtitle={`${todayFormatted} · ${stats.orgName}`}
      actions={<ClockInWidget />}
    >
      <div className="space-y-5">

        <motion.div variants={fadeUp} initial="hidden" animate="visible" className={`grid gap-4 grid-cols-1 ${statCards.length >= 4 ? "sm:grid-cols-2 lg:grid-cols-4" : statCards.length >= 3 ? "sm:grid-cols-2 md:grid-cols-3" : "sm:grid-cols-2"}`}>
          {statCards.map((stat, i) => (
            <StatCard
              key={stat.id}
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              href={stat.href}
              index={i}
            />
          ))}
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <QuickActions />
        </motion.div>

        {isCeo && <CeoAdminSection />}

        {isHrAdmin && <HrHomeSection />}

        {isManager && (
          <>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
            >
              <Suspense fallback={<WidgetSkeleton rows={4} />}>
                <TeamAttendanceWidgetNew />
              </Suspense>
              <Suspense fallback={<WidgetSkeleton rows={2} />}>
                <PendingApprovalsWidgetNew />
              </Suspense>
              <Suspense fallback={<WidgetSkeleton rows={3} />}>
                <MyTasksWidget />
              </Suspense>
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
            >
              <Suspense fallback={<WidgetSkeleton rows={3} />}>
                <UpcomingLeavesWidget />
              </Suspense>
              <Suspense fallback={<WidgetSkeleton rows={3} />}>
                <AnnouncementsWidget />
              </Suspense>
              <Suspense fallback={<WidgetSkeleton rows={3} />}>
                <QuickActionsWidget />
              </Suspense>
            </motion.div>
          </>
        )}

        {isEmployee && (
          <>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="grid gap-4 grid-cols-1 md:grid-cols-2"
            >
              <Suspense fallback={<WidgetSkeleton rows={4} />}>
                <MyTasksWidget />
              </Suspense>
              <Suspense fallback={<WidgetSkeleton rows={3} />}>
                <LeaveBalanceWidgetNew />
              </Suspense>
            </motion.div>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
            >
              <Suspense fallback={<WidgetSkeleton rows={3} />}>
                <UpcomingLeavesWidget />
              </Suspense>
              <Suspense fallback={<WidgetSkeleton rows={3} />}>
                <AnnouncementsWidget />
              </Suspense>
              <Suspense fallback={<WidgetSkeleton rows={3} />}>
                <QuickActionsWidget />
              </Suspense>
            </motion.div>
          </>
        )}

        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="grid gap-4 grid-cols-1 lg:grid-cols-7 md:auto-rows-[24rem]">
          <div className="lg:col-span-4 min-h-0">
            <MyIssuesCard
              tickets={sortedMyTickets}
              isLoading={ticketsLoading}
              error={ticketsError}
            />
          </div>
          <div className="lg:col-span-3 min-h-0">
            <SprintCard summary={sprintSummary ?? undefined} isLoading={sprintLoading} />
          </div>
        </motion.div>

        {(() => {
          const showProjects = !isEmployee || projectsLoading || (recentProjects?.length ?? 0) > 0;
          const showActivity = !isEmployee || activityLoading || (recentActivity?.length ?? 0) > 0;
          const colCount = (showProjects ? 1 : 0) + (showActivity ? 1 : 0) + (isAdmin ? 1 : 0);
          if (colCount === 0) return null;
          const gridClass = colCount === 1 ? "grid-cols-1" : colCount === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
          return (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" className={`grid gap-4 grid-cols-1 ${gridClass} md:auto-rows-[24rem]`}>
              {showProjects && (
                <div className="sm:col-span-1 min-h-0">
                  <RecentProjectsCard
                    projects={recentProjects?.map((p) => ({ ...p, key: p.key ?? "" }))}
                    isLoading={projectsLoading}
                    error={projectsError}
                    onCreateProject={handleGoToProjects}
                  />
                </div>
              )}
              {showActivity && (
                <div className="sm:col-span-1 min-h-0">
                  <RecentActivityCard
                    items={recentActivity}
                    isLoading={activityLoading}
                    error={activityError}
                  />
                </div>
              )}
              {isAdmin && (
                <div className={`${colCount === 3 ? "sm:col-span-2 lg:col-span-1" : "sm:col-span-1"} min-h-0`}>
                  <TeamCard members={teamAvailability} isLoading={teamLoading} />
                </div>
              )}
            </motion.div>
          );
        })()}

      </div>
    </PageWrapper>
  );
}
