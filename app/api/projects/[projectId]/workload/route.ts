import { type NextRequest } from "next/server";
import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets, users } from "@/lib/db/schema";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { requireProjectAccess, parseIdParam } from "@/lib/projects/require-project-access";

/**
 * MIYO-0120: workload per person on one project. Resource allocation is
 * org-level and counts tickets only; this totals points and hours, and can be
 * narrowed to one sprint.
 *
 * Work is counted against the ticket's primary assignee, which is what the
 * board's assignee lanes use.
 */
type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await ctx.params;
    const guard = await requireProjectAccess(session, rawProjectId, "view");
    if (!guard.ok) return guard.response;

    const sprintId = parseIdParam(req.nextUrl.searchParams.get("sprintId") ?? undefined);

    const rows = await db
      .select({
        userId: tickets.assigneeId,
        firstName: users.firstName,
        lastName: users.lastName,
        image: users.image,
        openTickets: sql<number>`count(*) filter (where ${tickets.status} <> 'DONE' and ${tickets.status} <> 'CANCELLED')`,
        doneTickets: sql<number>`count(*) filter (where ${tickets.status} = 'DONE')`,
        points: sql<number>`coalesce(sum(${tickets.points}), 0)`,
        estimateHours: sql<number>`coalesce(sum(${tickets.originalEstimate}), 0)`,
        loggedHours: sql<number>`coalesce(sum(${tickets.timeSpent}), 0)`,
      })
      .from(tickets)
      .leftJoin(users, eq(tickets.assigneeId, users.id))
      .where(
        and(
          eq(tickets.projectId, guard.projectId),
          eq(tickets.orgId, session.orgId),
          isNull(tickets.deletedAt),
          ne(tickets.status, "CANCELLED"),
          ...(sprintId !== null ? [eq(tickets.sprintId, sprintId)] : []),
        ),
      )
      .groupBy(tickets.assigneeId, users.firstName, users.lastName, users.image);

    return ok(
      rows
        .map((r) => ({
          userId: r.userId,
          name: [r.firstName, r.lastName].filter(Boolean).join(" ") || null,
          image: r.image,
          openTickets: Number(r.openTickets),
          doneTickets: Number(r.doneTickets),
          points: Number(r.points),
          estimateHours: Number(r.estimateHours),
          loggedHours: Number(r.loggedHours),
        }))
        // Busiest first; unassigned work sorts with everyone else so it is
        // not quietly ignored.
        .sort((a, b) => b.estimateHours - a.estimateHours || b.openTickets - a.openTickets),
    );
  });
}
