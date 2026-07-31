"server-only";

import { db } from "@/lib/db";
import {
  supportTickets,
  supportTicketMessages,
  crmActivities,
  csatResponses,
  organizationMembers,
  users,
} from "@/lib/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { subDays } from "date-fns";
import { isSlaBreached } from "@/lib/constants/support-sla";

type SupportActivityType = "ticket" | "escalation";

/**
 * Records a support lifecycle event into crm_activities (category "support") so the
 * Recent Activity feed reflects real ticket activity in near-real-time. Best-effort:
 * failures are swallowed so they never block the primary ticket mutation.
 */
export async function logSupportActivity(args: {
  orgId: string;
  type: SupportActivityType;
  message: string;
  person?: string | null;
  occurredAt?: Date;
  tx?: typeof db;
}): Promise<void> {
  const runner = args.tx ?? db;
  try {
    await runner.insert(crmActivities).values({
      orgId: args.orgId,
      type: args.type,
      message: args.message,
      time: (args.occurredAt ?? new Date()).toISOString(),
      person: args.person ?? null,
      category: "support",
    });
  } catch {
    // non-fatal: activity feed is supplementary to the mutation itself
  }
}

export interface SupportFilters {
  status?: "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigneeId?: string;
  page?: number;
  limit?: number;
}

export async function getSupportTickets(orgId: string, filters?: SupportFilters) {
  const limit = filters?.limit ?? 50;
  const offset = ((filters?.page ?? 1) - 1) * limit;

  const conditions = [eq(supportTickets.orgId, orgId)];
  if (filters?.status)
    conditions.push(eq(supportTickets.status, filters.status));
  if (filters?.priority)
    conditions.push(eq(supportTickets.priority, filters.priority));
  if (filters?.assigneeId)
    conditions.push(eq(supportTickets.assigneeId, filters.assigneeId));

  const [items, [countResult]] = await Promise.all([
    db.query.supportTickets.findMany({
      where: and(...conditions),
      orderBy: [desc(supportTickets.createdAt)],
      limit,
      offset,
      with: {
        client: { columns: { id: true, name: true } },
        assignee: { columns: { id: true, name: true, image: true } },
        creator: { columns: { id: true, name: true } },
      },
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(supportTickets)
      .where(and(...conditions)),
  ]);

  return {
    items,
    total: countResult?.count ?? 0,
    page: filters?.page ?? 1,
    totalPages: Math.ceil((countResult?.count ?? 0) / limit),
  };
}

export async function getSupportTicket(orgId: string, id: number) {
  return db.query.supportTickets.findFirst({
    where: and(eq(supportTickets.id, id), eq(supportTickets.orgId, orgId)),
    with: {
      client: true,
      assignee: { columns: { id: true, name: true, image: true } },
      creator: { columns: { id: true, name: true } },
      messages: {
        with: {
          author: { columns: { id: true, name: true, image: true } },
        },
        orderBy: [desc(supportTicketMessages.createdAt)],
      },
    },
  });
}

const SUPPORT_TEAM_ROLES = ["CEO", "ADMIN", "HR", "BRANCH_HR", "CUSTOMER_SUPPORT"] as const;

export interface SupportTicketStats {
  open: number;
  in_progress: number;
  waiting: number;
  resolved: number;
  closed: number;
  sla_breached: number;
}

export async function getSupportTicketStats(orgId: string): Promise<SupportTicketStats> {
  const rows = await db
    .select({
      status: supportTickets.status,
      priority: supportTickets.priority,
      createdAt: supportTickets.createdAt,
      resolvedAt: supportTickets.resolvedAt,
      closedAt: supportTickets.closedAt,
      slaDeadline: supportTickets.slaDeadline,
    })
    .from(supportTickets)
    .where(eq(supportTickets.orgId, orgId));

  const counts = { open: 0, in_progress: 0, waiting: 0, resolved: 0, closed: 0, sla_breached: 0 };
  const now = Date.now();

  for (const t of rows) {
    switch (t.status) {
      case "OPEN":
        counts.open += 1;
        break;
      case "IN_PROGRESS":
        counts.in_progress += 1;
        break;
      case "WAITING":
        counts.waiting += 1;
        break;
      case "RESOLVED":
        counts.resolved += 1;
        break;
      case "CLOSED":
        counts.closed += 1;
        break;
      default:
        break;
    }

    if (
      isSlaBreached({
        priority: t.priority,
        createdAt: t.createdAt,
        resolvedAt: t.resolvedAt ?? t.closedAt,
        slaDueAt: t.slaDeadline,
        isClosed: t.status === "CLOSED" || t.status === "RESOLVED",
        now,
      })
    ) {
      counts.sla_breached += 1;
    }
  }

  return counts;
}

export async function getSupportCsatAverage(orgId: string): Promise<{ avg: number; count: number }> {
  const [row] = await db
    .select({
      avg: sql<number>`COALESCE(AVG(${csatResponses.rating}), 0)::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(csatResponses)
    .where(eq(csatResponses.orgId, orgId));

  return { avg: row?.avg ?? 0, count: row?.count ?? 0 };
}

export async function getSupportTeamMembers(orgId: string) {
  const rows = await db
    .select({
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      role: organizationMembers.role,
      image: users.image,
      email: users.email,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        inArray(organizationMembers.role, [...SUPPORT_TEAM_ROLES]),
        eq(users.isActive, true),
      ),
    )
    .limit(20);

  return rows.map((r) => {
    const displayName =
      r.name || [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email || "Team member";
    const initials = displayName
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
    return {
      name: displayName,
      role: (r.role ?? "Support").replace(/_/g, " "),
      access: "Support",
      avatar: initials,
      status: "online" as const,
    };
  });
}

export async function getSupportActivityFallback(orgId: string, limit = 8) {
  const recent = await db
    .select({
      title: supportTickets.title,
      status: supportTickets.status,
      updatedAt: supportTickets.updatedAt,
      createdAt: supportTickets.createdAt,
    })
    .from(supportTickets)
    .where(eq(supportTickets.orgId, orgId))
    .orderBy(desc(supportTickets.updatedAt))
    .limit(limit);

  return recent.map((t) => ({
    type: "ticket" as const,
    message: `${t.title} — ${String(t.status).replace(/_/g, " ").toLowerCase()}`,
    time: relativeSupportTime(t.updatedAt ?? t.createdAt),
    person: "",
  }));
}

function relativeSupportTime(value: Date | string | null | undefined): string {
  if (!value) return "just now";
  const d = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
