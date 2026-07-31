"server-only";

import { db } from "@/lib/db";
import {
  departments,
  organizationMembers,
  attendance,
  leaveRequests,
  leaveBalances,
  leaveTypes,
  payrolls,
  salaryStructures,
  expenses,
  assets,
  documents,
  performanceReviews,
  goals,
  helpdeskTickets,
  users,
  holidays,
  wfhRequests,
} from "@/lib/db/schema";
import { timesheets, projectMembers, projects, tickets } from "@/lib/db/schema/projects";
import { incentives, incentiveConfig } from "@/lib/db/schema/crm";
import { eq, and, desc, gte, lte, asc, isNull, sql, ilike, or, count, inArray } from "drizzle-orm";
import { resolveWorkLogWindow } from "@/lib/hr/work-log-window";
import { formatDateOnly, getTodayString } from "@/lib/date-utils";
import { branchIdFilter, type BranchContext } from "@/lib/db/branch-filter";
import { resolveAttendancePeriod, summarizeAttendanceLogs } from "@/lib/hr/attendance-summary";
import type { DocumentExportFilters } from "@/lib/hr/documents-export-filters";
import type {
  Department,
  Employee,
  TerminatedEmployee,
  AttendanceLog,
  AttendanceSummaryPeriod,
  AttendancePeriodSummary,
  AttendanceStatusResult,
  LeavesResult,
  LeaveBalance,
  Payroll,
  PayrollWithUser,
  SalaryStructure,
  Expense,
  Asset,
  Document,
  PerformanceReview,
  Goal,
  HelpdeskTicket,
  EmployeeStats,
  EmployeePayslip,
  WfhRequest,
  Holiday,
  Incentive,
  IncentivesResult,
  IncentiveStats,
  IncentiveConfig,
  WorkLog,
  OrgChartNode,
  PaginatedResult,
  PaginatedEmployees,
} from "@/types/hr";

export async function getDepartments(orgId: string): Promise<Department[]> {
  return db.query.departments.findMany({
    where: eq(departments.orgId, orgId),
  }) as Promise<Department[]>;
}

function departmentFromId(
  departmentId: number | null | undefined,
  deptNameById: Map<number, string>,
): { id: number; name: string } | null {
  if (departmentId == null) return null;
  const name = deptNameById.get(departmentId);
  if (name) return { id: departmentId, name };
  // Orphaned departmentId (department deleted/missing): expose null so the
  // table renders "" instead of a misleading "Unknown" department (D18).
  return null;
}

export async function getEmployees(
  orgId: string,
  branch?: BranchContext
): Promise<Employee[]> {
  const [members, deptRows] = await Promise.all([
    db.query.organizationMembers.findMany({
      where: eq(organizationMembers.orgId, orgId),
      with: {
        user: true,
      },
    }),
    getDepartments(orgId),
  ]);
  const deptNameById = new Map(deptRows.map((d) => [d.id, d.name]));

  const seenIds = new Set<string>();
  const uniqueUsers = members
    .map((m) => m.user)
    .filter((u) => {
      if (seenIds.has(u.id)) return false;
      seenIds.add(u.id);
      return true;
    });

  return uniqueUsers
    .filter((u) => {
      if (u.isActive === false) return false;

      if (branch?.branchId !== null && branch?.branchId !== undefined &&
          ["BRANCH_MANAGER", "BRANCH_HR"].includes(branch.role)) {
        return u.branchId === branch.branchId;
      }
      return true;
    })
    .map((u) => ({
      id: u.id,
      name: u.name,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role ?? "EMPLOYEE",
      designation: u.designation,
      employeeId: u.employeeId,
      departmentId: u.departmentId,
      department: departmentFromId(u.departmentId, deptNameById),
      image: u.image,
      isActive: u.isActive ?? true,
      joiningDate: u.joiningDate,
      hasDashboardAccess: u.hasDashboardAccess ?? false,
      reportingTo: u.reportingTo,
      monthlySalary: u.monthlySalary,
      bio: u.bio ?? null,
      linkedinUrl: u.linkedinUrl ?? null,
      twitterUrl: u.twitterUrl ?? null,
      githubUrl: u.githubUrl ?? null,
      websiteUrl: u.websiteUrl ?? null,
      skills: u.skills ?? null,
      phone: u.phone ?? null,
    }));
}

export async function getTerminatedEmployees(
  orgId: string,
  branch?: BranchContext,
): Promise<TerminatedEmployee[]> {
  const [members, deptRows] = await Promise.all([
    db.query.organizationMembers.findMany({
      where: eq(organizationMembers.orgId, orgId),
      with: { user: true },
    }),
    getDepartments(orgId),
  ]);
  const deptNameById = new Map(deptRows.map((d) => [d.id, d.name]));

  const seenTerminatedIds = new Set<string>();
  const uniqueTerminated = members
    .map((m) => m.user)
    .filter((u) => {
      if (seenTerminatedIds.has(u.id)) return false;
      seenTerminatedIds.add(u.id);
      return true;
    });

  return uniqueTerminated
    .filter((u) => {
      if (u.isActive !== false) return false;

      if (
        branch?.branchId !== null &&
        branch?.branchId !== undefined &&
        ["BRANCH_MANAGER", "BRANCH_HR"].includes(branch.role)
      ) {
        return u.branchId === branch.branchId;
      }
      return true;
    })
    .map((u) => ({
      id: u.id,
      name: u.name,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role ?? "EMPLOYEE",
      designation: u.designation,
      employeeId: u.employeeId,
      departmentId: u.departmentId,
      department: departmentFromId(u.departmentId, deptNameById),
      image: u.image,
      isActive: false,
      joiningDate: u.joiningDate,
      hasDashboardAccess: u.hasDashboardAccess ?? false,
      reportingTo: u.reportingTo,
      monthlySalary: u.monthlySalary,
      bio: u.bio ?? null,
      linkedinUrl: u.linkedinUrl ?? null,
      twitterUrl: u.twitterUrl ?? null,
      githubUrl: u.githubUrl ?? null,
      websiteUrl: u.websiteUrl ?? null,
      skills: u.skills ?? null,
      phone: u.phone ?? null,
      terminatedAt: u.updatedAt ? u.updatedAt.toISOString() : null,
    }))
    .sort((a, b) => {
      const aTime = a.terminatedAt ? Date.parse(a.terminatedAt) : 0;
      const bTime = b.terminatedAt ? Date.parse(b.terminatedAt) : 0;
      return bTime - aTime;
    });
}

export {
  getEmployeesPaginated,
  type EmployeeListFilters,
} from "./hr/employees";

export async function getEmployee(orgId: string, userId: string): Promise<Employee | null> {
  const member = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.orgId, orgId),
      eq(organizationMembers.userId, userId)
    ),
    with: { user: true },
  });

  if (!member) return null;
  const u = member.user;

  let department: { id: number; name: string } | null = null;
  if (u.departmentId != null) {
    const dept = await db.query.departments.findFirst({
      where: and(eq(departments.id, u.departmentId), eq(departments.orgId, orgId)),
      columns: { name: true },
    });
    // Orphaned departmentId resolves to null (renders ""), not "Unknown" (D18).
    department = dept ? { id: u.departmentId, name: dept.name } : null;
  }

  return {
    id: u.id,
    name: u.name,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
    designation: u.designation,
    employeeId: u.employeeId,
    departmentId: u.departmentId,
    department,
    image: u.image,
    isActive: u.isActive,
    joiningDate: u.joiningDate,
    hasDashboardAccess: u.hasDashboardAccess,
    reportingTo: u.reportingTo,
    monthlySalary: u.monthlySalary,
    bio: u.bio ?? null,
    linkedinUrl: u.linkedinUrl ?? null,
    twitterUrl: u.twitterUrl ?? null,
    githubUrl: u.githubUrl ?? null,
    websiteUrl: u.websiteUrl ?? null,
    skills: u.skills ?? null,
    phone: u.phone ?? null,
  };
}

export async function getAttendanceStatus(
  orgId: string,
  userId: string
): Promise<AttendanceStatusResult> {
  const today = getTodayString();
  const now = new Date();

  const todayLogs = await db.query.attendance.findMany({
    where: and(
      eq(attendance.userId, userId),
      eq(attendance.date, today),
      eq(attendance.orgId, orgId)
    ),
  });

  let dailyWorkHours = 0;
  let dailyBreakHours = 0;
  let isDailyOvertime = false;

  for (const log of todayLogs) {
    dailyBreakHours += Number(log.breakHours || 0);

    if (!log.checkOut && log.checkIn) {
      const start = new Date(log.checkIn);
      const durationMs = now.getTime() - start.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      const netWork = durationHours - (Number(log.breakHours) || 0);
      dailyWorkHours += Math.max(0, netWork);
    } else {
      const rawWork = Number(log.workHours || 0);
      const breakHrs = Number(log.breakHours || 0);
      dailyWorkHours += Math.max(0, rawWork - breakHrs);
    }

    if (log.isOvertime) isDailyOvertime = true;
  }

  const todayLog = await db.query.attendance.findFirst({
    where: and(
      eq(attendance.userId, userId),
      eq(attendance.date, today),
      eq(attendance.orgId, orgId)
    ),
    orderBy: [desc(attendance.createdAt)],
  });

  let status: "OFFLINE" | "PRESENT" | "ON_BREAK" | "CHECKED_OUT" = "OFFLINE";
  if (todayLog) {
    if (todayLog.checkOut) status = "CHECKED_OUT";
    else if (todayLog.status === "ON_BREAK") status = "ON_BREAK";
    else status = "PRESENT";
  }

  const logs = await db.query.attendance.findMany({
    where: and(eq(attendance.userId, userId), eq(attendance.orgId, orgId)),
    orderBy: [desc(attendance.createdAt)],
    limit: 10,
  });

  let cooldownRemaining = 0;
  if (status === "CHECKED_OUT" && todayLog?.checkOut) {
    const lastCheckOut = new Date(todayLog.checkOut);
    const diffMs = now.getTime() - lastCheckOut.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    if (diffMinutes < 2) {
      cooldownRemaining = Math.ceil((2 * 60 * 1000 - diffMs) / 1000);
    }
  }

  const punchBlockedReason = null;

  return {
    status,
    logs: logs as unknown as AttendanceLog[],
    todayLog: todayLog as unknown as AttendanceLog | null,
    dailyStats: {
      workHours: dailyWorkHours.toFixed(2),
      breakHours: dailyBreakHours.toFixed(2),
      isOvertime: isDailyOvertime,
    },
    cooldownRemaining,
    punchBlockedReason,
  };
}

export async function getAttendanceLogs(
  orgId: string,
  userId: string,
  year?: number,
  month?: number,
  startDate?: string,
  endDate?: string,
): Promise<AttendanceLog[]> {
  if (startDate && endDate) {
    return db.query.attendance.findMany({
      where: and(
        eq(attendance.userId, userId),
        eq(attendance.orgId, orgId),
        gte(attendance.date, startDate),
        lte(attendance.date, endDate),
      ),
      orderBy: [desc(attendance.date)],
    }) as unknown as Promise<AttendanceLog[]>;
  }

  if (year !== undefined && month !== undefined) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    return db.query.attendance.findMany({
      where: and(
        eq(attendance.userId, userId),
        eq(attendance.orgId, orgId),
        gte(attendance.date, formatDateOnly(startDate)),
        lte(attendance.date, formatDateOnly(endDate))
      ),
      orderBy: [asc(attendance.date)],
    }) as unknown as Promise<AttendanceLog[]>;
  }

  return db.query.attendance.findMany({
    where: and(eq(attendance.userId, userId), eq(attendance.orgId, orgId)),
    orderBy: [desc(attendance.createdAt)],
    limit: 30,
  }) as unknown as Promise<AttendanceLog[]>;
}

export async function getAttendanceMonitor(orgId: string, date: string) {
  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      image: users.image,
      role: users.role,
      designation: users.designation,
      departmentName: departments.name,
      checkIn: attendance.checkIn,
      checkOut: attendance.checkOut,
      workHours: attendance.workHours,
      attendanceStatus: attendance.status,
      leaveApproved: leaveRequests.status,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .leftJoin(
      departments,
      and(eq(users.departmentId, departments.id), eq(departments.orgId, orgId)),
    )
    .leftJoin(
      attendance,
      and(eq(attendance.userId, users.id), eq(attendance.date, date), eq(attendance.orgId, orgId)),
    )
    .leftJoin(
      leaveRequests,
      and(
        eq(leaveRequests.userId, users.id),
        eq(leaveRequests.status, "APPROVED"),
        lte(leaveRequests.startDate, date),
        gte(leaveRequests.endDate, date),
      ),
    )
    .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true)));

  return rows.map((r) => {
    const displayName =
      r.firstName && r.lastName ? `${r.firstName} ${r.lastName}` : (r.name ?? r.email);

    let status: "PRESENT" | "ON_BREAK" | "CHECKED_OUT" | "ON_LEAVE" | "ABSENT" = "ABSENT";
    if (r.leaveApproved === "APPROVED") {
      status = "ON_LEAVE";
    } else if (r.attendanceStatus === "ON_BREAK") {
      status = "ON_BREAK";
    } else if (r.attendanceStatus === "CHECKED_OUT") {
      status = "CHECKED_OUT";
    } else if (r.checkIn) {
      status = "PRESENT";
    }

    return {
      userId: r.userId,
      name: displayName,
      email: r.email,
      image: r.image,
      role: r.role,
      designation: r.designation,
      departmentName: r.departmentName,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      workHours: r.workHours ? String(r.workHours) : null,
      status,
    };
  });
}

export async function getLeaves(orgId: string, userId: string): Promise<LeavesResult> {
  const [balances, types, requests] = await Promise.all([
    db.query.leaveBalances.findMany({
      where: and(
        eq(leaveBalances.userId, userId),
        eq(leaveBalances.orgId, orgId)
      ),
    }),
    db.query.leaveTypes.findMany({
      where: eq(leaveTypes.orgId, orgId),
    }),
    db.query.leaveRequests.findMany({
      where: and(
        eq(leaveRequests.userId, userId),
        eq(leaveRequests.orgId, orgId)
      ),
      orderBy: [desc(leaveRequests.createdAt)],
    }),
  ]);

  return {
    balances: balances as unknown as LeaveBalance[],
    types: types as unknown as import("@/types/hr").LeaveType[],
    requests: requests as unknown as import("@/types/hr").LeaveRequest[],
  };
}

export async function getLeaveBalance(orgId: string, userId: string): Promise<LeaveBalance[]> {
  return db.query.leaveBalances.findMany({
    where: and(
      eq(leaveBalances.userId, userId),
      eq(leaveBalances.orgId, orgId),
      eq(leaveBalances.year, new Date().getFullYear())
    ),
  }) as unknown as Promise<LeaveBalance[]>;
}

export async function getPayrolls(orgId: string, userId: string): Promise<Payroll[]> {
  return db.query.payrolls.findMany({
    where: and(
      eq(payrolls.userId, userId),
      eq(payrolls.orgId, orgId)
    ),
    orderBy: [desc(payrolls.createdAt)],
  }) as unknown as Promise<Payroll[]>;
}

export async function getSalaryStructures(
  orgId: string,
  userId?: string,
  requestingUserId?: string,
  isAdmin?: boolean
): Promise<SalaryStructure[]> {
  const conditions = [eq(salaryStructures.orgId, orgId)];

  if (userId) {
    conditions.push(eq(salaryStructures.userId, userId));
  } else if (!isAdmin && requestingUserId) {
    conditions.push(eq(salaryStructures.userId, requestingUserId));
  }

  return db.query.salaryStructures.findMany({
    where: and(...conditions),
    orderBy: [desc(salaryStructures.effectiveFrom)],
  }) as unknown as Promise<SalaryStructure[]>;
}

export async function getExpenses(
  orgId: string,
  userId: string,
  isAdmin: boolean,
  params?: {
    filterUserId?: string;
    status?: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ data: Expense[]; total: number; page: number; limit: number; totalPages: number }> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(expenses.orgId, orgId)];
  if (!isAdmin) {
    conditions.push(eq(expenses.userId, userId));
  } else if (params?.filterUserId) {
    conditions.push(eq(expenses.userId, params.filterUserId));
  }
  if (params?.status) conditions.push(eq(expenses.status, params.status));
  if (params?.startDate) conditions.push(gte(expenses.expenseDate, params.startDate));
  if (params?.endDate) conditions.push(lte(expenses.expenseDate, params.endDate));

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(expenses)
    .where(and(...conditions));

  const total = Number(countResult?.count || 0);

  const data = await db.query.expenses.findMany({
    where: and(...conditions),
    orderBy: [desc(expenses.expenseDate)],
    limit,
    offset,
  });

  return {
    data: data as unknown as Expense[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAssets(orgId: string): Promise<Asset[]> {
  return db.query.assets.findMany({
    where: eq(assets.orgId, orgId),
    orderBy: [desc(assets.createdAt)],
  }) as unknown as Promise<Asset[]>;
}

export async function getDocuments(
  orgId: string,
  userId: string,
  isAdmin: boolean,
  params?: {
    filterUserId?: string;
    type?: string;
  }
): Promise<Document[]> {
  const conditions = [
    eq(documents.orgId, orgId),
    eq(documents.isActive, true),
  ];

  if (params?.filterUserId) {
    conditions.push(eq(documents.userId, params.filterUserId));
  } else if (!isAdmin) {
    conditions.push(eq(documents.userId, userId));
  }

  if (params?.type) {
    conditions.push(eq(documents.type, params.type as import("@/types/hr").DocumentType));
  }

  return db.query.documents.findMany({
    where: and(...conditions),
    orderBy: [desc(documents.createdAt)],
  }) as unknown as Promise<Document[]>;
}

export async function getDocumentsForExport(
  orgId: string,
  sessionUserId: string,
  isAdmin: boolean,
  filters: DocumentExportFilters,
): Promise<Document[]> {
  const conditions = [eq(documents.orgId, orgId), eq(documents.isActive, true)];

  if (filters.filterUserId) {
    conditions.push(eq(documents.userId, filters.filterUserId));
  } else if (!isAdmin) {
    conditions.push(eq(documents.userId, sessionUserId));
  }

  if (filters.type) {
    conditions.push(eq(documents.type, filters.type as import("@/types/hr").DocumentType));
  }
  if (filters.category?.trim()) {
    conditions.push(ilike(documents.category, `%${filters.category.trim()}%`));
  }
  if (filters.uploadedBy?.trim()) {
    conditions.push(eq(documents.uploadedBy, filters.uploadedBy.trim()));
  }
  if (filters.createdFrom) {
    conditions.push(gte(documents.createdAt, new Date(`${filters.createdFrom}T00:00:00.000Z`)));
  }
  if (filters.createdTo) {
    conditions.push(lte(documents.createdAt, new Date(`${filters.createdTo}T23:59:59.999Z`)));
  }

  const rows = (await db.query.documents.findMany({
    where: and(...conditions),
    orderBy: [desc(documents.createdAt)],
  })) as unknown as Document[];

  const tag = filters.tag?.trim().toLowerCase();
  if (!tag) return rows;
  return rows.filter((d) =>
    d.tags?.some((t) => t.toLowerCase().includes(tag) || t.toLowerCase() === tag),
  );
}

export async function getPerformanceReviews(
  orgId: string,
  userId: string,
  isAdmin: boolean,
  filterUserId?: string
): Promise<PerformanceReview[]> {
  const conditions = [eq(performanceReviews.orgId, orgId)];

  if (filterUserId) {
    conditions.push(eq(performanceReviews.userId, filterUserId));
  } else if (!isAdmin) {
    conditions.push(eq(performanceReviews.userId, userId));
  }

  return db.query.performanceReviews.findMany({
    where: and(...conditions),
    orderBy: [desc(performanceReviews.periodEnd)],
  }) as unknown as Promise<PerformanceReview[]>;
}

export async function getGoals(
  orgId: string,
  userId: string,
  isAdmin: boolean,
  filterUserId?: string
): Promise<Goal[]> {
  const conditions = [eq(goals.orgId, orgId)];

  if (filterUserId) {
    conditions.push(eq(goals.userId, filterUserId));
  } else if (!isAdmin) {
    conditions.push(eq(goals.userId, userId));
  }

  return db.query.goals.findMany({
    where: and(...conditions),
    orderBy: [desc(goals.createdAt)],
  }) as unknown as Promise<Goal[]>;
}

export interface GetWorkLogsOptions {
  orgId: string;
  requesterId: string;
  isAdmin: boolean;
  year: number;
  quarter: number;
  month?: number;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  departmentId?: number;
  limit?: number;
}

export async function getWorkLogs(opts: GetWorkLogsOptions): Promise<WorkLog[]> {
  const { startDate, endDate } = resolveWorkLogWindow({
    year: opts.year,
    quarter: opts.quarter,
    month: opts.month,
    dateFrom: opts.dateFrom,
    dateTo: opts.dateTo,
  });

  let targetUserIds: string[];
  if (!opts.isAdmin) {
    targetUserIds = [opts.requesterId];
  } else if (opts.userId) {
    if (opts.departmentId != null) {
      const [member] = await db
        .select({ userId: users.id })
        .from(users)
        .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
        .where(
          and(
            eq(organizationMembers.orgId, opts.orgId),
            eq(users.id, opts.userId),
            eq(users.departmentId, opts.departmentId),
            eq(users.isActive, true),
          ),
        );
      if (!member) return [];
    }
    targetUserIds = [opts.userId];
  } else if (opts.departmentId != null) {
    const members = await db
      .select({ userId: users.id })
      .from(users)
      .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
      .where(
        and(
          eq(organizationMembers.orgId, opts.orgId),
          eq(users.departmentId, opts.departmentId),
          eq(users.isActive, true)
        )
      );
    targetUserIds = [...new Set(members.map((m) => m.userId))];
    if (targetUserIds.length === 0) return [];
  } else {
    const allMembers = await db
      .select({ userId: users.id })
      .from(users)
      .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
      .where(and(eq(organizationMembers.orgId, opts.orgId), eq(users.isActive, true)));
    targetUserIds = [...new Set(allMembers.map((m) => m.userId))];
    if (targetUserIds.length === 0) return [];
  }

  const userCondition =
    targetUserIds.length === 1
      ? eq(timesheets.userId, targetUserIds[0]!)
      : inArray(timesheets.userId, targetUserIds);

  const logs = await db.query.timesheets.findMany({
    where: and(
      eq(timesheets.orgId, opts.orgId),
      userCondition,
      gte(timesheets.date, startDate),
      lte(timesheets.date, endDate)
    ),
    with: {
      ticket: {
        columns: { id: true, title: true, ticketNumber: true },
        with: {
          project: { columns: { id: true, name: true, key: true } },
        },
      },
      user: { columns: { id: true, firstName: true, lastName: true, name: true } },
    },
    orderBy: [asc(timesheets.date)],
    limit: opts.limit ?? 3000,
  });

  return logs.map((l) => ({ ...l, date: String(l.date).slice(0, 10) })) as unknown as WorkLog[];
}

export async function getHelpdeskTickets(
  orgId: string,
  userId: string,
  isAdmin: boolean,
  params?: {
    filterUserId?: string;
    status?: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  }
): Promise<HelpdeskTicket[]> {
  const conditions = [eq(helpdeskTickets.orgId, orgId)];

  if (params?.filterUserId) {
    conditions.push(eq(helpdeskTickets.userId, params.filterUserId));
  } else if (!isAdmin) {
    conditions.push(eq(helpdeskTickets.userId, userId));
  }

  if (params?.status) {
    conditions.push(eq(helpdeskTickets.status, params.status));
  }

  return db.query.helpdeskTickets.findMany({
    where: and(...conditions),
    orderBy: [desc(helpdeskTickets.createdAt)],
  }) as unknown as Promise<HelpdeskTicket[]>;
}

export async function getOrgChart(orgId: string): Promise<OrgChartNode[]> {
  const members = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.orgId, orgId),
    with: { user: true },
  });

  const activeUsers = members
    .map((m) => m.user)
    .filter((u) => u.isActive !== false);

  // Deduplicate by userId — a user can only belong to one slot in the chart
  const seen = new Set<string>();
  const unique = activeUsers.filter((u) => {
    if (seen.has(u.id)) return false;
    seen.add(u.id);
    return true;
  });

  const activeIds = new Set(unique.map((u) => u.id));

  return unique.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role ?? "EMPLOYEE",
    designation: u.designation,
    image: u.image,
    departmentId: u.departmentId,
    // Nullify reportingTo if the manager no longer exists or is inactive
    reportingTo: u.reportingTo && activeIds.has(u.reportingTo) ? u.reportingTo : null,
  }));
}

export async function getEmployeeStats(orgId: string, userId: string): Promise<EmployeeStats> {
  const year = new Date().getFullYear();
  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;

  const [leaveData, attendanceData] = await Promise.all([
    db.query.leaveRequests.findMany({
      where: and(
        eq(leaveRequests.userId, userId),
        eq(leaveRequests.orgId, orgId),
        gte(leaveRequests.startDate, startOfYear),
        lte(leaveRequests.startDate, endOfYear)
      ),
    }),
    db.query.attendance.findMany({
      where: and(
        eq(attendance.userId, userId),
        eq(attendance.orgId, orgId),
        gte(attendance.date, startOfYear),
        lte(attendance.date, endOfYear)
      ),
    }),
  ]);

  const byType: Record<string, number> = {};
  let approved = 0;
  let pending = 0;
  let rejected = 0;

  for (const lr of leaveData) {
    if (lr.status === "APPROVED") approved++;
    else if (lr.status === "PENDING") pending++;
    else if (lr.status === "REJECTED") rejected++;
    const typeKey = lr.leaveTypeId?.toString() ?? "unknown";
    byType[typeKey] = (byType[typeKey] ?? 0) + 1;
  }

  let totalHours = 0;
  let daysPresent = 0;
  for (const log of attendanceData) {
    if (log.checkIn) {
      daysPresent++;
      totalHours += Number(log.workHours || 0);
    }
  }

  return {
    leaves: {
      total: leaveData.length,
      approved,
      pending,
      rejected,
      byType,
    },
    attendance: daysPresent > 0
      ? {
          daysPresent,
          daysAbsent: 0,
          daysLate: 0,
          totalHours: totalHours.toFixed(2),
          avgHoursPerDay: (totalHours / daysPresent).toFixed(2),
        }
      : null,
  };
}

export async function getEmployeeProjects(orgId: string, userId: string) {
  const memberships = await db
    .select({
      id: projects.id,
      name: projects.name,
      key: projects.key,
      status: projects.status,
      role: projectMembers.role,
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .where(and(eq(projectMembers.userId, userId), eq(projects.orgId, orgId)));

  return memberships;
}

export async function getEmployeeTickets(orgId: string, userId: string) {
  const data = await db
    .select({
      id: tickets.id,
      title: tickets.title,
      status: tickets.status,
      priority: tickets.priority,
      projectId: tickets.projectId,
      ticketNumber: tickets.ticketNumber,
    })
    .from(tickets)
    .where(and(eq(tickets.assigneeId, userId), eq(tickets.orgId, orgId)))
    .orderBy(desc(tickets.id))
    .limit(50);

  return { data };
}

export async function getWfhRequests(orgId: string, userId: string): Promise<WfhRequest[]> {
  return db.query.wfhRequests.findMany({
    where: and(eq(wfhRequests.orgId, orgId), eq(wfhRequests.userId, userId)),
    orderBy: [desc(wfhRequests.createdAt)],
  }) as unknown as Promise<WfhRequest[]>;
}

export async function getPendingWfhRequests(orgId: string): Promise<WfhRequest[]> {
  const rows = await db
    .select({
      id: wfhRequests.id,
      orgId: wfhRequests.orgId,
      userId: wfhRequests.userId,
      date: wfhRequests.date,
      reason: wfhRequests.reason,
      status: wfhRequests.status,
      approverId: wfhRequests.approverId,
      rejectionReason: wfhRequests.rejectionReason,
      createdAt: wfhRequests.createdAt,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userEmail: users.email,
      userImage: users.image,
    })
    .from(wfhRequests)
    .innerJoin(users, eq(wfhRequests.userId, users.id))
    .where(and(eq(wfhRequests.orgId, orgId), eq(wfhRequests.status, "PENDING")))
    .orderBy(desc(wfhRequests.createdAt));

  return rows.map((r) => ({
    id: r.id,
    orgId: r.orgId,
    userId: r.userId,
    date: r.date,
    reason: r.reason,
    status: r.status,
    approverId: r.approverId,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt,
    user: { id: r.userId, firstName: r.userFirstName, lastName: r.userLastName, email: r.userEmail, image: r.userImage },
  })) as WfhRequest[];
}

export async function getHolidays(orgId: string, year: number): Promise<Holiday[]> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  return db.query.holidays.findMany({
    where: and(
      eq(holidays.orgId, orgId),
      gte(holidays.date, startDate),
      lte(holidays.date, endDate)
    ),
    orderBy: [asc(holidays.date)],
  }) as unknown as Promise<Holiday[]>;
}

export async function getHolidaysForCalendar(
  orgId: string,
  year: number,
  month: number
): Promise<Holiday[]> {
  const mm = String(month).padStart(2, "0");
  const startDate = `${year}-${mm}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

  return db.query.holidays.findMany({
    where: and(
      eq(holidays.orgId, orgId),
      gte(holidays.date, startDate),
      lte(holidays.date, endDate)
    ),
    orderBy: [asc(holidays.date)],
  }) as unknown as Promise<Holiday[]>;
}

export async function getIncentives(
  orgId: string,
  params?: { status?: string; page?: number; limit?: number }
): Promise<IncentivesResult> {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(incentives.orgId, orgId)];
  if (params?.status) {
    conditions.push(eq(incentives.status, params.status as "PENDING" | "APPROVED" | "REJECTED" | "ADDED_TO_PAYROLL"));
  }

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(incentives)
    .where(and(...conditions));

  const total = Number(countResult?.count || 0);

  const rows = await db
    .select({
      id: incentives.id,
      orgId: incentives.orgId,
      salesRepId: incentives.salesRepId,
      clientAccountId: incentives.clientAccountId,
      investmentAmount: incentives.investmentAmount,
      incentiveRate: incentives.incentiveRate,
      calculatedAmount: incentives.calculatedAmount,
      approvedAmount: incentives.approvedAmount,
      status: incentives.status,
      notes: incentives.notes,
      createdAt: incentives.createdAt,
      salesRepName: users.name,
      salesRepImage: users.image,
    })
    .from(incentives)
    .innerJoin(users, eq(incentives.salesRepId, users.id))
    .where(and(...conditions))
    .orderBy(desc(incentives.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    incentives: rows.map((r) => ({
      id: r.id,
      orgId: r.orgId,
      salesRepId: r.salesRepId,
      clientAccountId: r.clientAccountId,
      investmentAmount: r.investmentAmount,
      incentiveRate: r.incentiveRate,
      calculatedAmount: r.calculatedAmount,
      approvedAmount: r.approvedAmount,
      status: r.status,
      notes: r.notes,
      createdAt: r.createdAt,
      salesRep: { id: r.salesRepId, name: r.salesRepName, image: r.salesRepImage },
    })) as Incentive[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getIncentiveStats(orgId: string): Promise<IncentiveStats> {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [allRows, monthRows] = await Promise.all([
    db.query.incentives.findMany({
      where: eq(incentives.orgId, orgId),
    }),
    db.query.incentives.findMany({
      where: and(
        eq(incentives.orgId, orgId),
        gte(incentives.createdAt, new Date(monthStart))
      ),
    }),
  ]);

  let totalRevenue = 0;
  let approved = 0;
  let pending = 0;
  let thisMonth = 0;

  for (const inc of allRows) {
    const amount = Number(inc.calculatedAmount || 0);
    totalRevenue += amount;
    if (inc.status === "APPROVED" || inc.status === "ADDED_TO_PAYROLL") approved++;
    if (inc.status === "PENDING") pending++;
  }
  for (const inc of monthRows) {
    thisMonth += Number(inc.calculatedAmount || 0);
  }

  return {
    thisMonth: thisMonth.toFixed(2),
    totalRevenue: totalRevenue.toFixed(2),
    avgPerConversion: approved > 0 ? (totalRevenue / approved).toFixed(2) : "0.00",
    pending,
    approved,
  };
}

export async function getIncentiveConfigs(orgId: string): Promise<IncentiveConfig[]> {
  return db.query.incentiveConfig.findMany({
    where: and(eq(incentiveConfig.orgId, orgId), eq(incentiveConfig.isActive, true)),
    orderBy: [desc(incentiveConfig.effectiveFrom)],
  }) as unknown as Promise<IncentiveConfig[]>;
}

export async function getAllPayrolls(orgId: string, month: string): Promise<PayrollWithUser[]> {
  const rows = await db
    .select({
      id: payrolls.id,
      orgId: payrolls.orgId,
      userId: payrolls.userId,
      month: payrolls.month,
      basicSalary: payrolls.basicSalary,
      hra: payrolls.hra,
      specialAllowance: payrolls.specialAllowance,
      allowances: payrolls.allowances,
      lopDays: payrolls.lopDays,
      lopAmount: payrolls.lopAmount,
      halfDays: payrolls.halfDays,
      halfDayAmount: payrolls.halfDayAmount,
      ptAmount: payrolls.ptAmount,
      otherDeductions: payrolls.otherDeductions,
      structureDeductions: payrolls.structureDeductions,
      advanceRecoveryAmount: payrolls.advanceRecoveryAmount,
      deductions: payrolls.deductions,
      grossSalary: payrolls.grossSalary,
      netSalary: payrolls.netSalary,
      status: payrolls.status,
      generatedBy: payrolls.generatedBy,
      approvedBy: payrolls.approvedBy,
      paidBy: payrolls.paidBy,
      approvedAt: payrolls.approvedAt,
      paidAt: payrolls.paidAt,
      overtimeType: payrolls.overtimeType,
      overtimeDays: payrolls.overtimeDays,
      overtimeHours: payrolls.overtimeHours,
      overtimeAmount: payrolls.overtimeAmount,
      payslipUrl: payrolls.payslipUrl,
      createdAt: payrolls.createdAt,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userDesignation: users.designation,
      userMonthlySalary: users.monthlySalary,
    })
    .from(payrolls)
    .innerJoin(users, eq(payrolls.userId, users.id))
    .where(and(eq(payrolls.orgId, orgId), eq(payrolls.month, month)))
    .orderBy(desc(payrolls.createdAt));

  return rows.map((r) => ({
    id: r.id,
    orgId: r.orgId,
    userId: r.userId,
    month: r.month,
    basicSalary: r.basicSalary,
    hra: r.hra,
    specialAllowance: r.specialAllowance,
    allowances: r.allowances,
    lopDays: r.lopDays,
    lopAmount: r.lopAmount,
    halfDays: r.halfDays,
    halfDayAmount: r.halfDayAmount,
    ptAmount: r.ptAmount,
    otherDeductions: r.otherDeductions,
    structureDeductions: r.structureDeductions,
    advanceRecoveryAmount: r.advanceRecoveryAmount,
    deductions: r.deductions,
    grossSalary: r.grossSalary,
    netSalary: r.netSalary,
    status: r.status,
    generatedBy: r.generatedBy,
    approvedBy: r.approvedBy,
    paidBy: r.paidBy,
    approvedAt: r.approvedAt,
    paidAt: r.paidAt,
    overtimeType: r.overtimeType,
    overtimeDays: r.overtimeDays,
    overtimeHours: r.overtimeHours,
    overtimeAmount: r.overtimeAmount,
    payslipUrl: r.payslipUrl,
    createdAt: r.createdAt,
    user: {
      firstName: r.userFirstName,
      lastName: r.userLastName,
      designation: r.userDesignation,
      monthlySalary: r.userMonthlySalary,
    },
  })) as PayrollWithUser[];
}

export async function getEmployeePayslips(
  orgId: string,
  userId: string,
  opts?: { paidOnly?: boolean }
): Promise<EmployeePayslip[]> {
  const whereClauses = [eq(payrolls.orgId, orgId), eq(payrolls.userId, userId)];
  if (opts?.paidOnly) whereClauses.push(eq(payrolls.status, "PAID"));

  const rows = await db
    .select({
      id: payrolls.id,
      userId: payrolls.userId,
      month: payrolls.month,
      basicSalary: payrolls.basicSalary,
      hra: payrolls.hra,
      specialAllowance: payrolls.specialAllowance,
      allowances: payrolls.allowances,
      lopDays: payrolls.lopDays,
      lopAmount: payrolls.lopAmount,
      halfDays: payrolls.halfDays,
      halfDayAmount: payrolls.halfDayAmount,
      ptAmount: payrolls.ptAmount,
      pfEmployee: payrolls.pfEmployee,
      pfEmployer: payrolls.pfEmployer,
      esiEmployee: payrolls.esiEmployee,
      esiEmployer: payrolls.esiEmployer,
      advanceRecoveryAmount: payrolls.advanceRecoveryAmount,
      otherDeductions: payrolls.otherDeductions,
      structureDeductions: payrolls.structureDeductions,
      deductions: payrolls.deductions,
      grossSalary: payrolls.grossSalary,
      netSalary: payrolls.netSalary,
      status: payrolls.status,
      overtimeType: payrolls.overtimeType,
      overtimeDays: payrolls.overtimeDays,
      overtimeHours: payrolls.overtimeHours,
      overtimeAmount: payrolls.overtimeAmount,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userDesignation: users.designation,
      userJoiningDate: users.joiningDate,
      userEmployeeId: users.employeeId,
      userTaxId: users.taxId,
      userBankDetails: users.bankDetails,
    })
    .from(payrolls)
    .leftJoin(users, eq(payrolls.userId, users.id))
    .where(and(...whereClauses))
    .orderBy(desc(payrolls.month));

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    month: r.month,
    basicSalary: r.basicSalary,
    hra: r.hra,
    specialAllowance: r.specialAllowance,
    allowances: r.allowances,
    lopDays: r.lopDays,
    lopAmount: r.lopAmount,
    halfDays: r.halfDays,
    halfDayAmount: r.halfDayAmount,
    ptAmount: r.ptAmount,
    pfEmployee: r.pfEmployee,
    pfEmployer: r.pfEmployer,
    esiEmployee: r.esiEmployee,
    esiEmployer: r.esiEmployer,
    advanceRecoveryAmount: r.advanceRecoveryAmount,
    otherDeductions: r.otherDeductions,
    structureDeductions: r.structureDeductions,
    deductions: r.deductions,
    grossSalary: r.grossSalary,
    netSalary: r.netSalary,
    status: r.status,
    overtimeType: r.overtimeType,
    overtimeDays: r.overtimeDays,
    overtimeHours: r.overtimeHours,
    overtimeAmount: r.overtimeAmount,
    user: r.userFirstName != null || r.userLastName != null
      ? {
          firstName: r.userFirstName,
          lastName: r.userLastName,
          designation: r.userDesignation,
          joiningDate: r.userJoiningDate,
          employeeId: r.userEmployeeId,
          taxId: r.userTaxId,
          bankDetails: r.userBankDetails,
        }
      : null,
  })) as unknown as EmployeePayslip[];
}

export async function getMonthlyAttendance(
  orgId: string,
  userId: string,
  year: number,
  month: number
): Promise<AttendanceLog[]> {
  const mm = String(month + 1).padStart(2, "0");
  const startDate = `${year}-${mm}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

  return db.query.attendance.findMany({
    where: and(
      eq(attendance.userId, userId),
      eq(attendance.orgId, orgId),
      gte(attendance.date, startDate),
      lte(attendance.date, endDate)
    ),
    orderBy: [asc(attendance.date)],
  }) as unknown as Promise<AttendanceLog[]>;
}

export async function getAttendanceInDateRange(
  orgId: string,
  userId: string,
  startDate: string,
  endDate: string,
): Promise<AttendanceLog[]> {
  return db.query.attendance.findMany({
    where: and(
      eq(attendance.userId, userId),
      eq(attendance.orgId, orgId),
      gte(attendance.date, startDate),
      lte(attendance.date, endDate),
    ),
    orderBy: [asc(attendance.date)],
  }) as unknown as Promise<AttendanceLog[]>;
}

export async function getAttendanceSummaryWithLogs(
  orgId: string,
  userId: string,
  period: AttendanceSummaryPeriod,
  year: number,
  month0?: number,
  quarter1?: number,
): Promise<{ summary: AttendancePeriodSummary; logs: AttendanceLog[] }> {
  const { start, end, label } = resolveAttendancePeriod(period, year, month0, quarter1);
  const [logs, holidayRows] = await Promise.all([
    getAttendanceInDateRange(orgId, userId, start, end),
    db.query.holidays.findMany({
      where: and(
        eq(holidays.orgId, orgId),
        gte(holidays.date, start),
        lte(holidays.date, end),
      ),
      columns: { date: true },
    }),
  ]);
  const holidayDates = new Set(holidayRows.map((h) => h.date));
  const summary = summarizeAttendanceLogs(logs, start, end, new Date(), period, label, holidayDates);
  return { summary, logs };
}
