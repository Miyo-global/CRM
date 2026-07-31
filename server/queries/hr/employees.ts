"server-only";

import { db } from "@/lib/db";
import { departments, organizationMembers, users, leaveRequests, attendance } from "@/lib/db/schema";
import { timesheets, projectMembers, projects, tickets, sprints } from "@/lib/db/schema/projects";
import { eq, and, desc, gte, lte, ilike, or, count } from "drizzle-orm";

function departmentFromId(
  departmentId: number | null | undefined,
  deptNameById: Map<number, string>,
): { id: number; name: string } | null {
  if (departmentId == null) return null;
  const name = deptNameById.get(departmentId);
  if (name) return { id: departmentId, name };
  // Orphaned departmentId: return null so the directory renders "" (D18).
  return null;
}
import { branchIdFilter, type BranchContext } from "@/lib/db/branch-filter";
import { DEFAULT_PAGE_SIZE, clampPageSize } from "@/lib/pagination-constants";
import { backfillMissingEmployeeIds } from "@/lib/hr/ensure-employee-ids";
import type {
  Department,
  Employee,
  EmployeeStats,
  OrgChartNode,
  PaginatedEmployees,
} from "@/types/hr";

export async function getDepartments(orgId: string): Promise<Department[]> {
  return db.query.departments.findMany({
    where: eq(departments.orgId, orgId),
  }) as Promise<Department[]>;
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

export type EmployeeListFilters = {
  search?: string;
  departmentName?: string;
  role?: string;
  status?: "active" | "inactive" | "all";
};

export async function getEmployeesPaginated(
  orgId: string,
  page: number = 1,
  limit: number = DEFAULT_PAGE_SIZE,
  filters?: EmployeeListFilters,
  branch?: BranchContext
): Promise<PaginatedEmployees> {
  await backfillMissingEmployeeIds(orgId);

  const safeLimit = clampPageSize(limit);
  const offset = (page - 1) * safeLimit;
  const search = filters?.search?.trim();

  const baseConditions = [eq(organizationMembers.orgId, orgId)];

  const status = filters?.status ?? "active";
  if (status === "active") {
    baseConditions.push(eq(users.isActive, true));
  } else if (status === "inactive") {
    baseConditions.push(eq(users.isActive, false));
  }

  const branchCond = branchIdFilter(users.branchId, branch ?? { role: "", branchId: null, userId: "" });
  if (branchCond) baseConditions.push(branchCond);

  if (filters?.role && filters.role !== "All") {
    baseConditions.push(eq(users.role, filters.role));
  }

  if (filters?.departmentName && filters.departmentName !== "All") {
    baseConditions.push(eq(departments.name, filters.departmentName));
  }

  const searchConditions = search
    ? [
        ...baseConditions,
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.employeeId, `%${search}%`),
          ilike(users.designation, `%${search}%`)
        ),
      ]
    : baseConditions;

  const [dataResult, countResult] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        designation: users.designation,
        employeeId: users.employeeId,
        departmentId: users.departmentId,
        departmentName: departments.name,
        image: users.image,
        isActive: users.isActive,
        joiningDate: users.joiningDate,
        hasDashboardAccess: users.hasDashboardAccess,
        reportingTo: users.reportingTo,
        monthlySalary: users.monthlySalary,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .leftJoin(
        departments,
        and(eq(users.departmentId, departments.id), eq(departments.orgId, orgId)),
      )
      .where(and(...searchConditions))
      .orderBy(users.name)
      .limit(safeLimit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .leftJoin(
        departments,
        and(eq(users.departmentId, departments.id), eq(departments.orgId, orgId)),
      )
      .where(and(...searchConditions)),
  ]);

  const total = countResult[0]?.total ?? 0;

  const data: Employee[] = dataResult.map((row) => {
    const { departmentName, ...rest } = row;
    // departmentName comes from a LEFT JOIN; when null the departmentId is
    // orphaned, so expose null (renders "") rather than "Unknown" (D18).
    const department =
      rest.departmentId != null && departmentName
        ? { id: rest.departmentId, name: departmentName }
        : null;
    return {
      ...rest,
      department,
      bio: null,
      linkedinUrl: null,
      twitterUrl: null,
      githubUrl: null,
      websiteUrl: null,
      skills: null,
      phone: null,
    };
  });

  return {
    data,
    pagination: {
      page,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
}

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

export async function getOrgChart(orgId: string): Promise<OrgChartNode[]> {
  const members = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.orgId, orgId),
    with: { user: true },
  });

  return members
    .map((m) => m.user)
    .filter((u) => u.isActive !== false)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role ?? "EMPLOYEE",
      designation: u.designation,
      image: u.image,
      departmentId: u.departmentId,
      reportingTo: u.reportingTo,
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
  const rows = await db
    .select({
      id: tickets.id,
      title: tickets.title,
      status: tickets.status,
      priority: tickets.priority,
      updatedAt: tickets.updatedAt,
      ticketNumber: tickets.ticketNumber,
      sequenceId: tickets.sequenceId,
      projectId: tickets.projectId,
      projectName: projects.name,
      projectKey: projects.key,
      sprintName: sprints.name,
    })
    .from(tickets)
    .leftJoin(projects, eq(tickets.projectId, projects.id))
    .leftJoin(sprints, eq(tickets.sprintId, sprints.id))
    .where(and(eq(tickets.assigneeId, userId), eq(tickets.orgId, orgId)))
    .orderBy(desc(tickets.updatedAt))
    .limit(50);

  return {
    data: rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority,
      updatedAt: row.updatedAt,
      ticketNumber: row.ticketNumber,
      sequenceId: row.sequenceId,
      project: row.projectId
        ? {
            id: row.projectId,
            name: row.projectName ?? "Unknown project",
            key: row.projectKey ?? "",
          }
        : null,
      sprint: row.sprintName ? { name: row.sprintName } : null,
    })),
  };
}
