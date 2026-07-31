"server-only";

import { db } from "@/lib/db";
import {
  attendance,
  payrolls,
  projects,
  tickets,
  timesheets,
} from "@/lib/db/schema";
import { eq, and, sql, gte, lte, desc } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";

export interface AttendanceFilters {
  userId?: string;
  startDate: Date;
  endDate: Date;
}

export async function getAttendanceReport(orgId: string, filters: AttendanceFilters) {
  const { userId, startDate, endDate } = filters;

  const records = await db.query.attendance.findMany({
    where: and(
      eq(attendance.orgId, orgId),
      ...(userId ? [eq(attendance.userId, userId)] : []),
      gte(attendance.date, formatDateOnly(startDate)),
      lte(attendance.date, formatDateOnly(endDate))
    ),
    orderBy: [desc(attendance.date)],
  });

  const totalDays = records.length;
  const totalHours = records.reduce(
    (sum, r) => sum + (Number(r.workHours) || 0),
    0
  );
  const averageHours = totalDays > 0 ? totalHours / totalDays : 0;
  const overtimeDays = records.filter((r) => r.isOvertime).length;

  return {
    records,
    summary: {
      totalDays,
      totalHours: Math.round(totalHours * 10) / 10,
      averageHours: Math.round(averageHours * 10) / 10,
      overtimeDays,
    },
  };
}

export interface PayrollFilters {
  userId?: string;
  startMonth: string;
  endMonth: string;
}

export async function getPayrollReport(orgId: string, filters: PayrollFilters) {
  const { userId, startMonth, endMonth } = filters;

  const payrollsList = await db.query.payrolls.findMany({
    where: and(
      eq(payrolls.orgId, orgId),
      ...(userId ? [eq(payrolls.userId, userId)] : []),
      sql`${payrolls.month} >= ${startMonth}`,
      sql`${payrolls.month} <= ${endMonth}`
    ),
    orderBy: [desc(payrolls.month)],
  });

  const totalGross = payrollsList.reduce(
    (sum, p) => sum + parseFloat(p.grossSalary || "0"),
    0
  );
  const totalNet = payrollsList.reduce(
    (sum, p) => sum + parseFloat(p.netSalary || "0"),
    0
  );
  const totalDeductions = payrollsList.reduce(
    (sum, p) => sum + parseFloat(p.deductions || "0"),
    0
  );

  return {
    payrolls: payrollsList,
    summary: {
      count: payrollsList.length,
      totalGross: Math.round(totalGross * 10) / 10,
      totalNet: Math.round(totalNet * 10) / 10,
      totalDeductions: Math.round(totalDeductions * 10) / 10,
    },
  };
}

export interface ProjectReportFilters {
  projectId?: number;
  startDate?: Date;
  endDate?: Date;
}

export async function getProjectReport(orgId: string, filters?: ProjectReportFilters) {
  const conditions = [eq(projects.orgId, orgId)];
  if (filters?.projectId) {
    conditions.push(eq(projects.id, filters.projectId));
  }

  const projectsList = await db.query.projects.findMany({
    where: and(...conditions),
    with: {
      tickets: {
        with: {
          assignee: true,
        },
      },
    },
  });

  const projectStats = projectsList.map((project) => {
    const projectTickets = project.tickets || [];
    const totalTickets = projectTickets.length;
    const completedTickets = projectTickets.filter(
      (t) => t.status === "DONE"
    ).length;
    const inProgressTickets = projectTickets.filter(
      (t) => t.status === "IN_PROGRESS"
    ).length;
    const totalPoints = projectTickets.reduce(
      (sum, t) => sum + (t.points || 0),
      0
    );
    const completedPoints = projectTickets
      .filter((t) => t.status === "DONE")
      .reduce((sum, t) => sum + (t.points || 0), 0);

    return {
      projectId: project.id,
      projectName: project.name,
      totalTickets,
      completedTickets,
      inProgressTickets,
      totalPoints,
      completedPoints,
      completionRate:
        totalTickets > 0 ? (completedTickets / totalTickets) * 100 : 0,
      pointsCompletionRate:
        totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0,
    };
  });

  return {
    projects: projectStats,
    summary: {
      totalProjects: projectsList.length,
      activeProjects: projectsList.filter((p) => p.status === "ACTIVE").length,
      totalTickets: projectStats.reduce((sum, p) => sum + p.totalTickets, 0),
      completedTickets: projectStats.reduce(
        (sum, p) => sum + p.completedTickets,
        0
      ),
    },
  };
}

export interface TeamPerformanceFilters {
  startDate: Date;
  endDate: Date;
}

export async function getTeamPerformanceReport(orgId: string, filters: TeamPerformanceFilters) {
  const { startDate, endDate } = filters;

  const timeEntries = await db.query.timesheets.findMany({
    where: and(
      eq(timesheets.orgId, orgId),
      gte(timesheets.date, formatDateOnly(startDate)),
      lte(timesheets.date, formatDateOnly(endDate))
    ),
    with: {
      ticket: {
        with: {
          assignee: true,
        },
      },
    },
  });

  const userStats = new Map<
    string,
    {
      userId: string;
      userName: string;
      totalHours: number;
      ticketsWorked: Set<number>;
      ticketsCompleted: number;
    }
  >();

  timeEntries.forEach((entry) => {
    if (!entry.userId || !entry.ticket || !entry.ticketId) return;

    const existing = userStats.get(entry.userId);
    const hours = parseFloat(entry.hours || "0");

    if (existing) {
      existing.totalHours += hours;
      if (!existing.ticketsWorked) {
        existing.ticketsWorked = new Set<number>();
      }
      existing.ticketsWorked.add(entry.ticketId);
    } else {
      userStats.set(entry.userId, {
        userId: entry.userId,
        userName: entry.ticket?.assignee?.firstName || "Unknown",
        totalHours: hours,
        ticketsWorked: new Set([entry.ticketId]),
        ticketsCompleted: 0,
      });
    }
  });

  const completedTickets = await db.query.tickets.findMany({
    where: and(
      eq(tickets.orgId, orgId),
      eq(tickets.status, "DONE"),
      gte(tickets.updatedAt, startDate),
      lte(tickets.updatedAt, endDate)
    ),
  });

  completedTickets.forEach((ticket) => {
    if (ticket.assigneeId) {
      const stats = userStats.get(ticket.assigneeId);
      if (stats) {
        stats.ticketsCompleted += 1;
      }
    }
  });

  return Array.from(userStats.values()).map((stats) => ({
    ...stats,
    ticketsWorked: stats.ticketsWorked.size || 0,
  }));
}
