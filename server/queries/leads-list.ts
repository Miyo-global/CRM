"server-only";

import { db } from "@/lib/db";
import {
  leads,
  departmentMembers,
} from "@/lib/db/schema";
import {
  eq,
  and,
  desc,
  asc,
  sql,
  count,
  gte,
  lte,
  or,
  inArray,
  isNull,
} from "drizzle-orm";
import type {
  LeadFilters,
} from "@/types/leads";
import { pushBranchAssigneeFilter, type BranchContext } from "@/lib/db/branch-filter";

export async function getLeads(
  orgId: string,
  filters?: LeadFilters & { role?: string; userId?: string; branch?: BranchContext }
) {
  const where = [eq(leads.orgId, orgId), isNull(leads.deletedAt)];

  if (filters?.branch) {
    await pushBranchAssigneeFilter(where, leads.assignedToId, filters.branch);
  }

  if (filters?.role === "SALES" && filters.userId) {
    where.push(eq(leads.assignedToId, filters.userId));
  }
  if (filters?.status) where.push(eq(leads.status, filters.status));
  if (filters?.priority) where.push(eq(leads.priority, filters.priority));
  if (filters?.source) where.push(eq(leads.source, filters.source));
  if (filters?.assignedToId) where.push(eq(leads.assignedToId, filters.assignedToId));
  if (filters?.dateFrom) where.push(gte(leads.createdAt, new Date(filters.dateFrom)));
  if (filters?.dateTo) where.push(lte(leads.createdAt, new Date(filters.dateTo)));
  if (filters?.search) {
    const s = `%${filters.search.toLowerCase()}%`;
    const phoneDigits = filters.search.replace(/\D/g, "");
    const conditions = [
      sql`LOWER(${leads.name}) LIKE ${s}`,
      sql`LOWER(${leads.email}) LIKE ${s}`,
      sql`LOWER(${leads.company}) LIKE ${s}`,
    ];
    if (phoneDigits) {
      conditions.push(
        sql`REGEXP_REPLACE(${leads.phone}, '\\D', '', 'g') LIKE ${`%${phoneDigits}%`}`
      );
    }
    where.push(or(...conditions)!);
  }

  const colMap = {
    name: leads.name,
    email: leads.email,
    company: leads.company,
    status: leads.status,
    priority: leads.priority,
    source: leads.source,
    score: leads.score,
    potentialValue: leads.potentialValue,
    createdAt: leads.createdAt,
  } as const;

  const sortBy = filters?.sortBy ?? "createdAt";
  const sortOrder = filters?.sortOrder ?? "desc";
  const orderCol = colMap[sortBy as keyof typeof colMap] ?? leads.createdAt;
  const orderFn = sortOrder === "asc" ? asc(orderCol) : desc(orderCol);

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 50;
  const offset = (page - 1) * limit;
  const whereClause = and(...where);

  const [allLeads, totalResult] = await Promise.all([
    db.query.leads.findMany({
      where: whereClause,
      with: {
        assignedTo: { columns: { id: true, name: true, image: true } },
        campaign: { columns: { id: true, name: true } },
      },
      orderBy: [orderFn],
      limit,
      offset,
    }),
    db.select({ count: count() }).from(leads).where(whereClause),
  ]);

  const totalCount = totalResult[0]?.count ?? 0;
  return {
    leads: allLeads,
    totalCount,
    page,
    totalPages: Math.ceil(totalCount / limit),
  };
}

export async function getLeadBoard(
  orgId: string,
  opts?: { role?: string; userId?: string; branch?: BranchContext; perStatusLimit?: number }
) {
  const perStatusLimit = Math.max(1, Math.min(200, opts?.perStatusLimit ?? 50));
  const filters = [eq(leads.orgId, orgId), isNull(leads.deletedAt)];
  const role = opts?.role;
  const userId = opts?.userId;

  if (opts?.branch) {
    await pushBranchAssigneeFilter(filters, leads.assignedToId, opts.branch);
  }

  if (role === "SALES" && userId) {
    filters.push(eq(leads.assignedToId, userId));
  } else if (userId && role && !["CEO", "HR"].includes(role)) {
    const teamLeadDepts = await db.query.departmentMembers.findMany({
      where: and(
        eq(departmentMembers.userId, userId),
        eq(departmentMembers.role, "lead")
      ),
    });
    if (teamLeadDepts.length > 0) {
      const deptIds = teamLeadDepts.map((d) => d.departmentId);
      const teamMembers = await db.query.departmentMembers.findMany({
        where: inArray(departmentMembers.departmentId, deptIds),
      });
      const teamUserIds = [...new Set(teamMembers.map((m) => m.userId))];
      filters.push(inArray(leads.assignedToId, teamUserIds));
    } else {
      filters.push(eq(leads.assignedToId, userId));
    }
  }

  const STATUSES = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"] as const;
  type LeadStatus = typeof STATUSES[number];

  const perStatusResults = await Promise.all(
    STATUSES.map((s) =>
      db.query.leads.findMany({
        where: and(...filters, eq(leads.status, s)),
        with: { assignedTo: { columns: { id: true, name: true, image: true } } },
        orderBy: [desc(leads.createdAt)],
        limit: perStatusLimit,
      })
    )
  );

  type LeadRow = typeof perStatusResults[number][number];
  const board = {} as Record<LeadStatus, LeadRow[]>;
  STATUSES.forEach((s, i) => {
    board[s] = perStatusResults[i];
  });
  return board;
}

export async function getLeadStats(
  orgId: string,
  filters?: { dateFrom?: string; dateTo?: string; role?: string; userId?: string; branch?: BranchContext }
) {
  const statsFilters = [eq(leads.orgId, orgId), isNull(leads.deletedAt)];
  if (filters?.branch) {
    await pushBranchAssigneeFilter(statsFilters, leads.assignedToId, filters.branch);
  }
  if (filters?.role === "SALES" && filters.userId) {
    statsFilters.push(eq(leads.assignedToId, filters.userId));
  }
  if (filters?.dateFrom) {
    statsFilters.push(gte(leads.createdAt, new Date(filters.dateFrom)));
  }
  if (filters?.dateTo) {
    const to = new Date(filters.dateTo);
    to.setHours(23, 59, 59, 999);
    statsFilters.push(lte(leads.createdAt, to));
  }

  const allLeads = await db.query.leads.findMany({ where: and(...statsFilters) });

  const total = allLeads.length;
  const byStatus = {
    NEW: allLeads.filter((l) => l.status === "NEW").length,
    CONTACTED: allLeads.filter((l) => l.status === "CONTACTED").length,
    INTERESTED: allLeads.filter((l) => l.status === "INTERESTED").length,
    QUALIFIED: allLeads.filter((l) => l.status === "QUALIFIED").length,
    CONVERTED: allLeads.filter((l) => l.status === "CONVERTED").length,
    LOST: allLeads.filter((l) => l.status === "LOST").length,
  };

  const conversionRate = total > 0 ? (byStatus.CONVERTED / total) * 100 : 0;
  const totalPotentialValue = allLeads.reduce(
    (s, l) => s + Number(l.potentialValue ?? 0),
    0
  );
  const unassigned = allLeads.filter((l) => !l.assignedToId).length;

  const now = new Date();
  const thisMonth = allLeads.filter((l) => {
    const created = new Date(l.createdAt!);
    return (
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear()
    );
  }).length;

  return {
    total,
    byStatus,
    conversionRate: Math.round(conversionRate * 10) / 10,
    totalPotentialValue,
    unassigned,
    thisMonth,
  };
}
