"server-only";

import { db } from "@/lib/db";
import {
  projects,
  attendance,
  organizations,
  organizationMembers,
  users,
  projectMembers,
  sprints,
  tickets,
  ticketAssignees,
  crmActivities,
  announcements,
  leaveBalances,
  leaveTypes,
  leaveRequests,
  calendarEvents,
  notifications,
  timesheets,
  deals,
  jobPostings,
  leads,
  expenses,
  targets,
  auditLogs,
} from "@/lib/db/schema";
import { eq, and, desc, or, inArray, count, sql, gte, lte, lt, isNull, gt, sum, ne } from "drizzle-orm";
import { getTodayString } from "@/lib/date-utils";
import { isAdminOrOwner } from "@/lib/auth/helpers";

async function coassignedTicketIdsForUser(userId: string): Promise<number[]> {
  const rows = await db
    .select({ ticketId: ticketAssignees.ticketId })
    .from(ticketAssignees)
    .where(eq(ticketAssignees.userId, userId));
  return [...new Set(rows.map((r) => r.ticketId))];
}

function ticketsVisibleToAssignee(orgId: string, userId: string, coassignedIds: number[]) {
  const byPrimary = eq(tickets.assigneeId, userId);
  if (coassignedIds.length === 0) {
    return and(eq(tickets.orgId, orgId), byPrimary);
  }
  return and(eq(tickets.orgId, orgId), or(byPrimary, inArray(tickets.id, coassignedIds)));
}

export async function getDashboardStats(orgId: string, _userId: string) {
  const today = getTodayString();

  const [org, memberCountResult, projectCountResult, attendanceCountResult] =
    await Promise.all([
      db.query.organizations.findFirst({
        where: eq(organizations.id, orgId),
      }),
      db
        .select({ count: count() })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(
          and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true))
        ),
      db
        .select({ count: count() })
        .from(projects)
        .where(eq(projects.orgId, orgId)),
      db
        .select({ count: count() })
        .from(attendance)
        .where(
          and(eq(attendance.orgId, orgId), eq(attendance.date, today))
        ),
    ]);

  return {
    orgName: org?.name || "Organization",
    totalEmployees: Number(memberCountResult[0]?.count || 0),
    activeProjects: Number(projectCountResult[0]?.count || 0),
    presentToday: Number(attendanceCountResult[0]?.count || 0),
    orgSlug: org?.slug || orgId.slice(0, 8),
  };
}

export async function getRecentProjects(orgId: string, userId: string, role?: string | null) {
  const isOwnerOrAdmin = isAdminOrOwner(role ?? "");

  if (isOwnerOrAdmin) {
    return db.query.projects.findMany({
      where: eq(projects.orgId, orgId),
      orderBy: [desc(projects.id)],
      limit: 5,
      with: {
        manager: {
          columns: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
      },
    });
  }

  const memberOf = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));

  const projectIds = memberOf.map((m) => m.projectId);

  return db.query.projects.findMany({
    where: and(
      eq(projects.orgId, orgId),
      or(
        eq(projects.managerId, userId),
        projectIds.length > 0 ? inArray(projects.id, projectIds) : undefined
      )
    ),
    orderBy: [desc(projects.id)],
    limit: 5,
    with: {
      manager: {
        columns: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          image: true,
        },
      },
    },
  });
}

export async function getTeamAvailability(orgId: string) {
  const today = getTodayString();

  const todayAttendance = await db
    .select({
      userId: attendance.userId,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      userName: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      userImage: users.image,
    })
    .from(attendance)
    .innerJoin(users, eq(attendance.userId, users.id))
    .where(and(eq(attendance.orgId, orgId), eq(attendance.date, today)));

  return todayAttendance.map((record) => ({
    userId: record.userId,
    name:
      record.firstName && record.lastName
        ? `${record.firstName} ${record.lastName}`
        : record.userName || "Unknown",
    image: record.userImage,
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    isOnline: record.checkIn && !record.checkOut,
  }));
}

export async function getMyIssues(orgId: string, userId: string) {
  const coIds = await coassignedTicketIdsForUser(userId);
  return db.query.tickets.findMany({
    where: ticketsVisibleToAssignee(orgId, userId, coIds),
    orderBy: [desc(tickets.updatedAt)],
    limit: 10,
    with: {
      project: {
        columns: { id: true, name: true, key: true },
      },
      assignee: {
        columns: { id: true, firstName: true, lastName: true, image: true },
      },
    },
  });
}

export async function getActiveSprintSummary(orgId: string, userId: string, role?: string | null) {
  const isOwnerOrAdmin = isAdminOrOwner(role ?? "");

  let projectIds: number[];
  if (isOwnerOrAdmin) {
    const allProjects = await db.query.projects.findMany({
      where: eq(projects.orgId, orgId),
      columns: { id: true },
    });
    projectIds = allProjects.map((p) => p.id);
  } else {
    const memberOf = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId));
    projectIds = memberOf.map((m) => m.projectId);
  }

  if (projectIds.length === 0) return null;

  const activeSprint = await db.query.sprints.findFirst({
    where: and(
      eq(sprints.orgId, orgId),
      eq(sprints.status, "ACTIVE"),
      inArray(sprints.projectId, projectIds)
    ),
    with: {
      project: {
        columns: { id: true, name: true },
      },
      tickets: {
        columns: { id: true, status: true, points: true },
      },
    },
  });

  if (!activeSprint) return null;

  const sprintTickets = activeSprint.tickets || [];
  const totalTickets = sprintTickets.length;
  const doneTickets = sprintTickets.filter((t) => t.status === "DONE").length;
  const inProgressTickets = sprintTickets.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW"
  ).length;
  const todoTickets = totalTickets - doneTickets - inProgressTickets;
  const totalPoints = sprintTickets.reduce(
    (sum, t) => sum + (t.points || 0),
    0
  );
  const completedPoints = sprintTickets
    .filter((t) => t.status === "DONE")
    .reduce((sum, t) => sum + (t.points || 0), 0);
  const progress =
    totalPoints > 0
      ? Math.round((completedPoints / totalPoints) * 100)
      : totalTickets > 0
      ? Math.round((doneTickets / totalTickets) * 100)
      : 0;

  const now = new Date();
  const endDate = new Date(activeSprint.endDate);
  const daysRemaining = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    id: activeSprint.id,
    name: activeSprint.name,
    projectName: activeSprint.project?.name || "Project",
    projectId: activeSprint.project?.id,
    progress,
    daysRemaining,
    totalTickets,
    doneTickets,
    inProgressTickets,
    todoTickets,
    totalPoints,
    completedPoints,
  };
}

export async function getRoleStats(orgId: string, userId: string): Promise<Record<string, number>> {
  const coIds = await coassignedTicketIdsForUser(userId);
  const today = getTodayString();

  const [
    myProjectsRow,
    myTicketsRow,
    myTicketsDoneRow,
    myTicketsInProgressRow,
    myLeadsRow,
    myConvertedRow,
    myDealsRow,
    activeTargets,
  ] = await Promise.all([
    db
      .select({ c: sql<number>`count(distinct ${projects.id})::int` })
      .from(projects)
      .leftJoin(projectMembers, eq(projectMembers.projectId, projects.id))
      .where(
        and(
          eq(projects.orgId, orgId),
          or(eq(projects.managerId, userId), eq(projectMembers.userId, userId)),
        ),
      ),
    db
      .select({ c: count() })
      .from(tickets)
      .where(and(ticketsVisibleToAssignee(orgId, userId, coIds), ne(tickets.status, "DONE"))),
    db
      .select({ c: count() })
      .from(tickets)
      .where(and(ticketsVisibleToAssignee(orgId, userId, coIds), eq(tickets.status, "DONE"))),
    db
      .select({ c: count() })
      .from(tickets)
      .where(
        and(
          ticketsVisibleToAssignee(orgId, userId, coIds),
          or(eq(tickets.status, "IN_PROGRESS"), eq(tickets.status, "IN_REVIEW")),
        ),
      ),
    db
      .select({ c: count() })
      .from(leads)
      .where(
        and(
          eq(leads.orgId, orgId),
          eq(leads.assignedToId, userId),
          isNull(leads.deletedAt),
          ne(leads.status, "CONVERTED"),
          ne(leads.status, "LOST"),
        ),
      ),
    db
      .select({ c: count() })
      .from(leads)
      .where(
        and(
          eq(leads.orgId, orgId),
          eq(leads.assignedToId, userId),
          isNull(leads.deletedAt),
          eq(leads.status, "CONVERTED"),
        ),
      ),
    db
      .select({ c: count() })
      .from(deals)
      .where(
        and(
          eq(deals.orgId, orgId),
          eq(deals.assignedToId, userId),
          ne(deals.stage, "WON"),
          ne(deals.stage, "LOST"),
        ),
      ),
    db.query.targets.findMany({
      where: and(
        eq(targets.orgId, orgId),
        eq(targets.userId, userId),
        lte(targets.startDate, today),
        gte(targets.endDate, today),
      ),
      columns: { targetValue: true, currentValue: true },
    }),
  ]);

  let targetProgress = 0;
  if (activeTargets.length > 0) {
    let acc = 0;
    let n = 0;
    for (const t of activeTargets) {
      const tv = Number(t.targetValue);
      const cv = Number(t.currentValue ?? 0);
      if (tv > 0) {
        acc += Math.min(cv / tv, 1);
        n += 1;
      }
    }
    targetProgress = n > 0 ? Math.round((acc / n) * 100) : 0;
  }

  return {
    myProjects: Number(myProjectsRow[0]?.c ?? 0),
    myTickets: Number(myTicketsRow[0]?.c ?? 0),
    myTicketsDone: Number(myTicketsDoneRow[0]?.c ?? 0),
    myTicketsInProgress: Number(myTicketsInProgressRow[0]?.c ?? 0),
    myLeads: Number(myLeadsRow[0]?.c ?? 0),
    myConverted: Number(myConvertedRow[0]?.c ?? 0),
    myDeals: Number(myDealsRow[0]?.c ?? 0),
    targetProgress,
  };
}

export async function getTodayActivities(orgId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const activities = await db.query.crmActivities.findMany({
    where: and(
      eq(crmActivities.orgId, orgId),
      gte(crmActivities.createdAt, todayStart),
      lt(crmActivities.createdAt, tomorrowStart)
    ),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
    limit: 20,
  });
  return activities.map((a) => ({ type: a.type, subject: a.message }));
}

export async function getActiveAnnouncements(orgId: string) {
  const now = new Date();
  const rows = await db
    .select({
      id: announcements.id,
      content: announcements.content,
      isPinned: announcements.isPinned,
      expiresAt: announcements.expiresAt,
      createdAt: announcements.createdAt,
      authorId: announcements.authorId,
      authorName: users.name,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
    })
    .from(announcements)
    .innerJoin(users, eq(announcements.authorId, users.id))
    .where(
      and(
        eq(announcements.orgId, orgId),
        or(isNull(announcements.expiresAt), gt(announcements.expiresAt, now))
      )
    )
    .orderBy(desc(announcements.isPinned), desc(announcements.createdAt))
    .limit(20);
  return rows;
}

export async function createAnnouncement(data: {
  orgId: string;
  authorId: string;
  content: string;
  isPinned?: boolean;
  expiresAt?: Date | null;
}) {
  const [row] = await db
    .insert(announcements)
    .values({
      orgId: data.orgId,
      authorId: data.authorId,
      content: data.content,
      isPinned: data.isPinned ?? false,
      expiresAt: data.expiresAt ?? null,
    })
    .returning();
  return row;
}

export async function deleteAnnouncement(id: number, orgId: string) {
  await db
    .delete(announcements)
    .where(and(eq(announcements.id, id), eq(announcements.orgId, orgId)));
}

export async function getPersonalDashboard(orgId: string, userId: string) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const coIds = await coassignedTicketIdsForUser(userId);
  const assignWhere = ticketsVisibleToAssignee(orgId, userId, coIds);

  const [myTasks, timesheetRows, leaveBalanceRows, upcomingEvents, unreadCount] = await Promise.all([
    db.query.tickets.findMany({
      where: and(
        assignWhere,
        or(
          eq(tickets.status, "TODO"),
          eq(tickets.status, "IN_PROGRESS"),
          eq(tickets.status, "IN_REVIEW"),
          eq(tickets.status, "BACKLOG"),
        ),
      ),
      orderBy: [desc(tickets.updatedAt)],
      limit: 10,
      with: {
        project: { columns: { id: true, name: true } },
      },
    }),
    db
      .select({ hours: sum(timesheets.hours) })
      .from(timesheets)
      .where(and(eq(timesheets.userId, userId), gte(timesheets.date, weekStart.toISOString().slice(0, 10)), lt(timesheets.date, weekEnd.toISOString().slice(0, 10)))),
    db
      .select({
        id: leaveBalances.id,
        balance: leaveBalances.balance,
        total: leaveTypes.daysPerYear,
        typeName: leaveTypes.name,
        year: leaveBalances.year,
      })
      .from(leaveBalances)
      .innerJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id))
      .where(and(eq(leaveBalances.userId, userId), eq(leaveBalances.year, now.getFullYear()))),
    db
      .select({ id: calendarEvents.id, title: calendarEvents.title, startDate: calendarEvents.startDate, endDate: calendarEvents.endDate, category: calendarEvents.category })
      .from(calendarEvents)
      .where(and(eq(calendarEvents.orgId, orgId), gte(calendarEvents.startDate, now)))
      .orderBy(calendarEvents.startDate)
      .limit(3),
    db
      .select({ cnt: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))),
  ]);

  const hoursLogged = Number(timesheetRows[0]?.hours ?? 0);
  const weekLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return {
    myTasks: myTasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: null,
      projectName: t.project?.name ?? null,
    })),
    timesheetStatus: {
      submitted: hoursLogged > 0,
      weekLabel,
      hoursLogged,
    },
    leaveBalance: leaveBalanceRows.map((r) => ({
      type: r.typeName ?? "Leave",
      remaining: Number(r.balance),
      total: r.total ?? 0,
    })),
    upcomingEvents: upcomingEvents.map((e) => ({
      id: e.id,
      title: e.title,
      startTime: e.startDate,
      endTime: e.endDate,
      type: e.category,
    })),
    unreadNotifications: Number(unreadCount[0]?.cnt ?? 0),
  };
}

export async function getExecutiveDashboard(orgId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  const [mrrRows, pipelineRows, headcountRows, openRolesRows, newLeadsRows, activeProjectsRows, totalLeadsRows, wonLeadsRows] = await Promise.all([
    db
      .select({ total: sum(deals.value) })
      .from(deals)
      .where(and(eq(deals.orgId, orgId), eq(deals.stage, "WON"), gte(deals.updatedAt, monthStart))),
    db
      .select({ total: sum(deals.value) })
      .from(deals)
      .where(and(eq(deals.orgId, orgId), or(eq(deals.stage, "LEAD"), eq(deals.stage, "CONTACTED"), eq(deals.stage, "PROPOSAL"), eq(deals.stage, "NEGOTIATION")))),
    db
      .select({ cnt: count() })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true))),
    db
      .select({ cnt: count() })
      .from(jobPostings)
      .where(and(eq(jobPostings.orgId, orgId), eq(jobPostings.status, "OPEN"))),
    db
      .select({ cnt: count() })
      .from(leads)
      .where(and(eq(leads.orgId, orgId), gte(leads.createdAt, weekStart))),
    db
      .select({ cnt: count() })
      .from(projects)
      .where(and(eq(projects.orgId, orgId), eq(projects.status, "ACTIVE"))),
    db.select({ cnt: count() }).from(leads).where(eq(leads.orgId, orgId)),
    db.select({ cnt: count() }).from(leads).where(and(eq(leads.orgId, orgId), eq(leads.status, "CONVERTED"))),
  ]);

  const total = Number(totalLeadsRows[0]?.cnt ?? 0);
  const won = Number(wonLeadsRows[0]?.cnt ?? 0);

  return {
    mrr: Number(mrrRows[0]?.total ?? 0),
    pipelineValue: Number(pipelineRows[0]?.total ?? 0),
    headcount: Number(headcountRows[0]?.cnt ?? 0),
    openRoles: Number(openRolesRows[0]?.cnt ?? 0),
    newLeadsThisWeek: Number(newLeadsRows[0]?.cnt ?? 0),
    activeProjects: Number(activeProjectsRows[0]?.cnt ?? 0),
    conversionRate: total > 0 ? Math.round((won / total) * 100) : 0,
  };
}

export async function getManagerDashboard(orgId: string, userId: string) {
  const today = new Date().toISOString().slice(0, 10);

  const [teamMembers, pendingLeaves, pendingExpenses, overdueTickets] = await Promise.all([
    db
      .select({
        userId: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        checkIn: attendance.checkIn,
        status: attendance.status,
        leaveStatus: leaveRequests.status,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .leftJoin(attendance, and(eq(attendance.userId, users.id), eq(attendance.date, today)))
      .leftJoin(leaveRequests, and(
        eq(leaveRequests.userId, users.id),
        eq(leaveRequests.status, "APPROVED"),
        lt(leaveRequests.startDate, today),
        gte(leaveRequests.endDate, today),
      ))
      .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true)))
      .limit(50),
    db
      .select({ cnt: count() })
      .from(leaveRequests)
      .where(and(eq(leaveRequests.orgId, orgId), eq(leaveRequests.status, "PENDING"))),
    db
      .select({ cnt: count() })
      .from(expenses)
      .where(and(eq(expenses.orgId, orgId), eq(expenses.status, "PENDING"))),
    db
      .select({ cnt: count() })
      .from(tickets)
      .where(and(eq(tickets.orgId, orgId), or(eq(tickets.status, "TODO"), eq(tickets.status, "IN_PROGRESS")))),
  ]);

  const teamAttendanceToday = teamMembers.map((m) => {
    let status: "present" | "absent" | "leave" = "absent";
    if (m.leaveStatus === "APPROVED") status = "leave";
    else if (m.checkIn) status = "present";
    return {
      userId: m.userId,
      name: m.firstName && m.lastName ? `${m.firstName} ${m.lastName}` : (m.name ?? "Unknown"),
      status,
    };
  });

  return {
    teamAttendanceToday,
    pendingLeaveApprovals: Number(pendingLeaves[0]?.cnt ?? 0),
    pendingExpenseApprovals: Number(pendingExpenses[0]?.cnt ?? 0),
    teamOverdueTasks: Number(overdueTickets[0]?.cnt ?? 0),
  };
}

export async function getRecentActivity(orgId: string, userId: string, role?: string | null) {
  const isOwnerOrAdmin = isAdminOrOwner(role ?? "");

  let projectIds: number[];
  if (isOwnerOrAdmin) {
    const allProjects = await db.query.projects.findMany({
      where: eq(projects.orgId, orgId),
      columns: { id: true },
    });
    projectIds = allProjects.map((p) => p.id);
  } else {
    const memberOf = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId));
    projectIds = memberOf.map((m) => m.projectId);
  }

  const ticketItems: Array<{
    id: string | number;
    title: string | null;
    status: string | null;
    type: string | null;
    priority: string | null;
    ticketNumber: number | null;
    updatedAt: Date | null;
    projectName: string;
    projectId: number | undefined;
    projectKey: string;
    assignee: { id: string; firstName: string | null; lastName: string | null; image: string | null } | null;
    activityKind: "ticket";
  }> = [];

  if (projectIds.length > 0) {
    const ticketFilters = [
      eq(tickets.orgId, orgId),
      inArray(tickets.projectId, projectIds),
    ];

    if (!isOwnerOrAdmin) {
      ticketFilters.push(
        or(
          eq(tickets.assigneeId, userId),
          eq(tickets.reporterId, userId)
        )!
      );
    }

    const recentTickets = await db.query.tickets.findMany({
      where: and(...ticketFilters),
      orderBy: [desc(tickets.updatedAt)],
      limit: 10,
      with: {
        project: { columns: { id: true, name: true, key: true } },
        assignee: { columns: { id: true, firstName: true, lastName: true, image: true } },
      },
    });

    for (const t of recentTickets) {
      ticketItems.push({
        id: t.id,
        title: t.title,
        status: t.status,
        type: t.type,
        priority: t.priority,
        ticketNumber: t.ticketNumber,
        updatedAt: t.updatedAt,
        projectName: t.project?.name || "",
        projectId: t.project?.id,
        projectKey: t.project?.key || "",
        assignee: t.assignee
          ? { id: t.assignee.id, firstName: t.assignee.firstName, lastName: t.assignee.lastName, image: t.assignee.image }
          : null,
        activityKind: "ticket",
      });
    }
  }

  const orgActivityItems: Array<{
    id: string | number;
    title: string;
    status: string;
    type: string;
    updatedAt: Date;
    actorName: string | null;
    activityKind: "org";
  }> = [];

  if (isOwnerOrAdmin) {
    const recentOrgLogs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        actorName: users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .where(
        and(
          eq(auditLogs.orgId, orgId),
          inArray(auditLogs.action, ["branch.created", "branch.updated", "branch.deleted"]),
        )
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(5);

    for (const log of recentOrgLogs) {
      const meta = log.metadata as Record<string, unknown> | null;
      const entityName = (meta?.name as string) ?? "Branch";
      const label =
        log.action === "branch.created" ? `Branch "${entityName}" was created` :
        log.action === "branch.updated" ? `Branch "${entityName}" was updated` :
        `Branch "${entityName}" was deleted`;

      orgActivityItems.push({
        id: `audit-${log.id}`,
        title: label,
        status: log.action === "branch.deleted" ? "deleted" : "active",
        type: "branch",
        updatedAt: log.createdAt,
        actorName: log.actorName,
        activityKind: "org",
      });
    }
  }

  const combined = [
    ...ticketItems.map((t) => ({ ...t, _ts: t.updatedAt?.getTime() ?? 0 })),
    ...orgActivityItems.map((a) => ({ ...a, _ts: a.updatedAt.getTime() })),
  ]
    .sort((a, b) => b._ts - a._ts)
    .slice(0, 15);

  return combined.map(({ _ts, ...item }) => item);
}
