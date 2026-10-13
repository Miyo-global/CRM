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
  Ticket,
  CheckCircle2,
  ListChecks,
  Zap,
} from "lucide-react";
import { ClockInWidget } from "@/components/attendance/clock-in-widget";
import { DashboardStatsSkeleton } from "@/components/ui/dashboard-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
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
import { SPAN } from "@/features/dashboard/bento";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const firstName = getFirstName(session);
  const role = session?.user?.role;
  const isCeo = role === "CEO";
  const isHrAdmin = role === "HR" || role === "ADMIN";
  const isAdmin = isCeo || isHrAdmin;
  const isEmployee = !isAdmin;

  const { data: stats, isLoading, error, refetch } = useDashboardStats({
    retry: 2,
    retryDelay: 1000,
  });

  const { data: recentProjects, isLoading: projectsLoading, error: projectsError, refetch: refetchProjects } = useRecentProjects();
  const { data: teamAvailability, isLoading: teamLoading } = useTeamAvailability();
  const { data: recentActivity, isLoading: activityLoading, error: activityError } = useRecentActivity();

  const { data: myIssuesData, isLoading: ticketsLoading, error: ticketsError, refetch: refetchMyIssues } = useMyIssues(
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
          { id: "present", label: "Present Today", value: stats.presentToday, icon: CalendarCheck, tone: "success" as const, href: "/hr/attendance" },
          { id: "org", label: "Organization", value: stats.orgName, icon: Building2, tone: "neutral" as const },
        ];
      case "HR":
        return [
          { id: "employees", label: "Total Employees", value: stats.totalEmployees, icon: Users, tone: "info" as const, href: "/hr" },
          { id: "present", label: "Present Today", value: stats.presentToday, icon: CalendarCheck, tone: "success" as const, href: "/hr/attendance" },
          { id: "org", label: "Organization", value: stats.orgName, icon: Building2, tone: "neutral" as const },
        ];
      case "SALES":
        return [
          { id: "projects", label: "My Projects", value: rs?.myProjects ?? 0, icon: Briefcase, tone: "info" as const, href: "/projects" },
          { id: "present", label: "Present Today", value: stats.presentToday, icon: CalendarCheck, tone: "success" as const, href: "/hr/attendance" },
        ];
      case "CUSTOMER_SUPPORT":
        return [
          { id: "projects", label: "My Projects", value: rs?.myProjects ?? 0, icon: Briefcase, tone: "brand" as const, href: "/projects" },
          { id: "tickets", label: "My Tickets", value: rs?.myTickets ?? 0, icon: Ticket, tone: "info" as const },
          { id: "done", label: "Completed", value: rs?.myTicketsDone ?? 0, icon: CheckCircle2, tone: "success" as const },
          { id: "inprogress", label: "In Progress", value: rs?.myTicketsInProgress ?? 0, icon: ListChecks, tone: "warning" as const },
        ];
      case "ENGINEERING":
      case "DESIGN":
      case "VIDEO_EDITOR":
      case "DIGITAL_MARKETING":
        return [
          { id: "projects", label: "My Projects", value: rs?.myProjects ?? 0, icon: Briefcase, tone: "brand" as const, href: "/projects" },
          { id: "tickets", label: "My Tasks", value: rs?.myTickets ?? 0, icon: ListChecks, tone: "info" as const },
          { id: "done", label: "Completed", value: rs?.myTicketsDone ?? 0, icon: CheckCircle2, tone: "success" as const },
          { id: "inprogress", label: "In Progress", value: rs?.myTicketsInProgress ?? 0, icon: Zap, tone: "warning" as const },
        ];
      default:
        return [
          { id: "org", label: "Organization", value: stats.orgName, icon: Building2, tone: "neutral" as const },
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

  // KPI row: up to 4 StatCards across 12 columns (fewer cards widen to fill).
  const kpiSpan =
    statCards.length >= 4
      ? "col-span-12 sm:col-span-6 xl:col-span-3"
      : statCards.length === 3
      ? "col-span-12 sm:col-span-4"
      : "col-span-12 sm:col-span-6 xl:col-span-4";

  if (isLoading) {
    const quickActionsList = getQuickActionsForRole(role);

    return (
      <PageWrapper
        title="Dashboard"
        subtitle="Loading your workspace..."
        actions={<Skeleton className="h-10 w-64 rounded-full" />}
      >
        <div className="grid grid-cols-12 gap-4 xl:gap-6" role="status" aria-live="polite" aria-label="Loading dashboard">
          <div className="col-span-12">
            <DashboardStatsSkeleton />
          </div>
          {quickActionsList.length > 0 ? (
            <div className="col-span-12 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {quickActionsList.map((a) => (
                <div key={a.label} className="flex h-14 items-center gap-3 rounded-lg border border-border bg-card px-3">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : null}
          <WidgetSkeleton rows={6} className={SPAN.twoThirds} />
          <WidgetSkeleton rows={3} className={SPAN.third} />
          <WidgetSkeleton rows={4} className={SPAN.third} />
          <WidgetSkeleton rows={4} className={SPAN.third} />
          <WidgetSkeleton rows={4} className={SPAN.third} />
        </div>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper title="Dashboard">
        <QueryErrorState
          title="Failed to load dashboard stats"
          error={error}
          onRetry={() => refetch()}
        />
      </PageWrapper>
    );
  }

  if (!stats) {
    return (
      <PageWrapper title="Dashboard">
        <EmptyState
          illustration={<EmptyActivityIllustration className="h-40 w-40" />}
          title="No data available"
          description="Dashboard statistics are not available. Please try refreshing."
          action={{
            label: "Refresh",
            onClick: handleGoToDashboard,
          }}
        />
      </PageWrapper>
    );
  }

  const showProjects = !isEmployee || projectsLoading || (recentProjects?.length ?? 0) > 0;
  const showActivity = !isEmployee || activityLoading || (recentActivity?.length ?? 0) > 0;
  const bottomCount = (showProjects ? 1 : 0) + (showActivity ? 1 : 0) + (isAdmin ? 1 : 0);
  const bottomSpan = bottomCount === 3 ? SPAN.third : bottomCount === 2 ? SPAN.half : SPAN.full;

  return (
    <PageWrapper
      title={`${greeting}, ${firstName}`}
      subtitle={<span className="tabular-nums">{todayFormatted} · {stats.orgName}</span>}
      actions={<ClockInWidget />}
    >
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-12 gap-4 xl:gap-6"
      >
        {statCards.map((stat, i) => (
          <div key={stat.id} className={kpiSpan}>
            <StatCard
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              tone={stat.tone}
              href={stat.href}
              index={i}
            />
          </div>
        ))}

        <div className={SPAN.full}>
          <QuickActions />
        </div>

        {isCeo && <CeoAdminSection />}

        {isHrAdmin && <HrHomeSection />}


        {isEmployee && (
          <>
            <div className={SPAN.twoThirds}>
              <Suspense fallback={<WidgetSkeleton rows={6} />}>
                <MyTasksWidget />
              </Suspense>
            </div>
            <div className={`${SPAN.third} flex flex-col gap-4 xl:gap-6`}>
              <Suspense fallback={<WidgetSkeleton rows={3} />}>
                <LeaveBalanceWidgetNew />
              </Suspense>
              <Suspense fallback={<WidgetSkeleton rows={2} />}>
                <QuickActionsWidget />
              </Suspense>
            </div>
            <div className={SPAN.half}>
              <Suspense fallback={<WidgetSkeleton rows={3} />}>
                <UpcomingLeavesWidget />
              </Suspense>
            </div>
            <div className={SPAN.half}>
              <Suspense fallback={<WidgetSkeleton rows={3} />}>
                <AnnouncementsWidget />
              </Suspense>
            </div>
          </>
        )}

        <div className={SPAN.twoThirds}>
          <MyIssuesCard
            tickets={sortedMyTickets}
            isLoading={ticketsLoading}
            error={ticketsError}
            onRetry={() => refetchMyIssues()}
          />
        </div>
        <div className={SPAN.third}>
          <SprintCard summary={sprintSummary ?? undefined} isLoading={sprintLoading} />
        </div>

        {showProjects && (
          <div className={bottomSpan}>
            <RecentProjectsCard
              projects={recentProjects?.map((p) => ({ ...p, key: p.key ?? "" }))}
              isLoading={projectsLoading}
              error={projectsError}
              onCreateProject={handleGoToProjects}
              onRetry={() => refetchProjects()}
            />
          </div>
        )}
        {showActivity && (
          <div className={bottomSpan}>
            <RecentActivityCard
              items={recentActivity}
              isLoading={activityLoading}
              error={activityError}
            />
          </div>
        )}
        {isAdmin && (
          <div className={bottomSpan}>
            <TeamCard members={teamAvailability} isLoading={teamLoading} />
          </div>
        )}
      </motion.div>
    </PageWrapper>
  );
}
