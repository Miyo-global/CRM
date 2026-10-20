import { type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import {
  announcements, calendarEvents, helpdeskTickets, holidays, leaveRequests, leaveTypes,
  organizationMembers, projects, tickets, users,
} from "@/lib/db/schema";
import { eq, and, desc, gt, ilike, isNull, or } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";
import { likePattern } from "@/lib/db/escape-like";
import { logger } from "@/lib/logger";
import { mergeSearchResults, type SearchResult } from "@/lib/search/merge-results";

const querySchema = z.object({
  q: z.string().min(3, "Query must be at least 3 characters"),
  limit: z.coerce.number().min(1).max(20).optional(),
});

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { q, limit } = parseQuery(req, querySchema);
    // A truncated base64 of the query collided for long queries sharing a
    // prefix; hash the whole query instead. Leaves and Helpdesk tickets are
    // scoped to the viewer, so the viewer is part of the key.
    const queryHash = createHash("sha256")
      .update(`${session.user.id}\0${session.user.role}\0${q}\0${limit ?? ""}`)
      .digest("base64url")
      .slice(0, 32);
    const viewer = { userId: session.user.id, isAdmin: isAdminOrOwner(session.user.role) };
    const data = await cached(
      CACHE_KEYS.searchResults(session.orgId, queryHash),
      () => executeSearch(session.orgId, viewer, q, limit),
      { ttlSeconds: CACHE_TTL.SHORT },
    );
    return ok(data);
  });
}

async function executeSearch(
  orgId: string,
  viewer: { userId: string; isAdmin: boolean },
  q: string,
  limit?: number,
) {
  const maxPer = Math.min(limit ?? 5, 20);
  const pattern = likePattern(q);

  // Tickets, projects and people — the palette used to find nothing but
  // tickets, so searching a colleague's name came back empty (QA-0039).
  const sources: Record<string, () => Promise<SearchResult[]>> = {
    tickets: async () => {
      const rows = await db
        .select({ id: tickets.id, title: tickets.title, status: tickets.status, projectId: tickets.projectId })
        .from(tickets)
        .where(and(eq(tickets.orgId, orgId), ilike(tickets.title, pattern), isNull(tickets.deletedAt)))
        .limit(maxPer);
      return rows.map(t => ({ id: t.id, type: "ticket" as const, title: t.title, subtitle: `Ticket #${t.id}`, href: `/projects/${t.projectId}?ticket=${t.id}`, status: t.status }));
    },
    projects: async () => {
      const rows = await db
        .select({ id: projects.id, name: projects.name, key: projects.key, status: projects.status })
        .from(projects)
        .where(
          and(
            eq(projects.orgId, orgId),
            isNull(projects.deletedAt),
            or(ilike(projects.name, pattern), ilike(projects.key, pattern)),
          ),
        )
        .limit(maxPer);
      return rows.map(p => ({ id: p.id, type: "project" as const, title: p.name, subtitle: `Project ${p.key}`, href: `/projects/${p.id}`, status: p.status ?? undefined }));
    },
    people: async () => {
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          designation: users.designation,
          isActive: users.isActive,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(
          and(
            eq(organizationMembers.orgId, orgId),
            or(ilike(users.name, pattern), ilike(users.employeeId, pattern)),
          ),
        )
        .limit(maxPer);
      return rows.map(e => ({
        id: e.id,
        type: "employee" as const,
        title: e.name ?? "Employee",
        subtitle: e.designation ?? "Employee",
        href: `/hr/employees/${e.id}`,
        status: e.isActive === false ? "INACTIVE" : undefined,
      }));
    },
    // Each source below follows the visibility of its own page (QA-BUG-25):
    // calendar events, active announcements and holidays are org-wide;
    // Helpdesk tickets and leaves are the viewer's own unless they are an admin.
    events: async () => {
      const rows = await db
        .select({ id: calendarEvents.id, title: calendarEvents.title, startDate: calendarEvents.startDate })
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.orgId, orgId),
            or(ilike(calendarEvents.title, pattern), ilike(calendarEvents.location, pattern)),
          ),
        )
        .orderBy(desc(calendarEvents.startDate))
        .limit(maxPer);
      return rows.map(e => ({ id: e.id, type: "event" as const, title: e.title, subtitle: e.startDate.toISOString().slice(0, 10), href: "/calendar" }));
    },
    announcements: async () => {
      const rows = await db
        .select({ id: announcements.id, content: announcements.content, createdAt: announcements.createdAt })
        .from(announcements)
        .where(
          and(
            eq(announcements.orgId, orgId),
            or(isNull(announcements.expiresAt), gt(announcements.expiresAt, new Date())),
            ilike(announcements.content, pattern),
          ),
        )
        .orderBy(desc(announcements.createdAt))
        .limit(maxPer);
      return rows.map(a => ({ id: a.id, type: "announcement" as const, title: a.content.slice(0, 120), subtitle: `Announcement · ${a.createdAt.toISOString().slice(0, 10)}`, href: "/dashboard" }));
    },
    holidays: async () => {
      const rows = await db
        .select({ id: holidays.id, name: holidays.name, date: holidays.date })
        .from(holidays)
        .where(and(eq(holidays.orgId, orgId), ilike(holidays.name, pattern)))
        .orderBy(desc(holidays.date))
        .limit(maxPer);
      return rows.map(h => ({ id: h.id, type: "holiday" as const, title: h.name, subtitle: `Holiday · ${h.date}`, href: "/hr/holidays" }));
    },
    helpdesk: async () => {
      const rows = await db
        .select({ id: helpdeskTickets.id, title: helpdeskTickets.title, status: helpdeskTickets.status })
        .from(helpdeskTickets)
        .where(
          and(
            eq(helpdeskTickets.orgId, orgId),
            viewer.isAdmin ? undefined : eq(helpdeskTickets.userId, viewer.userId),
            ilike(helpdeskTickets.title, pattern),
          ),
        )
        .orderBy(desc(helpdeskTickets.createdAt))
        .limit(maxPer);
      return rows.map(t => ({ id: t.id, type: "helpdesk" as const, title: t.title, subtitle: `Helpdesk #${t.id}`, href: `/hr/helpdesk?q=${encodeURIComponent(t.title)}`, status: t.status ?? undefined }));
    },
    leaves: async () => {
      const rows = await db
        .select({
          id: leaveRequests.id,
          startDate: leaveRequests.startDate,
          endDate: leaveRequests.endDate,
          status: leaveRequests.status,
          userName: users.name,
          typeName: leaveTypes.name,
        })
        .from(leaveRequests)
        .innerJoin(users, eq(leaveRequests.userId, users.id))
        .leftJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id))
        .where(
          and(
            eq(leaveRequests.orgId, orgId),
            viewer.isAdmin ? undefined : eq(leaveRequests.userId, viewer.userId),
            or(ilike(users.name, pattern), ilike(leaveTypes.name, pattern), ilike(leaveRequests.reason, pattern)),
          ),
        )
        .orderBy(desc(leaveRequests.startDate))
        .limit(maxPer);
      return rows.map(l => ({
        id: l.id,
        type: "leave" as const,
        title: `${l.typeName ?? "Leave"} · ${l.userName ?? "Employee"}`,
        subtitle: l.startDate === l.endDate ? l.startDate : `${l.startDate} – ${l.endDate}`,
        href: "/hr/leaves",
        status: l.status ?? undefined,
      }));
    },
  };

  const names = Object.keys(sources);
  const settled = await Promise.allSettled(names.map((name) => sources[name]()));
  settled.forEach((outcome, i) => {
    if (outcome.status === "rejected") {
      logger.error(`Search source "${names[i]}" failed`, outcome.reason);
    }
  });
  return mergeSearchResults(names, settled);
}
