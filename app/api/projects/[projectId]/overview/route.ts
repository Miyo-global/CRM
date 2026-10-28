import { NextRequest } from "next/server";
import { and, asc, eq, gte, isNull, lt, desc, inArray, notInArray, sql, count } from "drizzle-orm";
import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projects, tickets, ticketActivity } from "@/lib/db/schema";
import { requireProjectAccess } from "@/lib/projects/require-project-access";
import { computeHealth, isDoneStatus, isNotStartedStatus } from "@/lib/projects/project-health";
import { getTodayString } from "@/lib/date-utils";

type RouteParams = { params: Promise<{ projectId: string }> };

const DONE_STATUSES = ["DONE", "CLOSED", "CANCELLED", "COMPLETED", "RESOLVED"];

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "view");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;

    const live = and(eq(tickets.projectId, projectId), eq(tickets.orgId, session.orgId), isNull(tickets.deletedAt));
    const open = and(live, notInArray(tickets.status, DONE_STATUSES));
    const today = getTodayString();
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const ticketCols = { id: tickets.id, title: tickets.title, ticketNumber: tickets.ticketNumber, status: tickets.status, dueDate: tickets.dueDate, priority: tickets.priority };

    const [project, byStatus, overdue, unassignedUrgent, stale, doneThisWeek] = await Promise.all([
      db.query.projects.findFirst({ where: eq(projects.id, projectId), columns: { status: true, startDate: true, endDate: true, key: true } }),
      db.select({ status: tickets.status, n: count() }).from(tickets).where(live).groupBy(tickets.status),
      db.select(ticketCols).from(tickets).where(and(open, lt(tickets.dueDate, today))).orderBy(asc(tickets.dueDate)).limit(5),
      db.select(ticketCols).from(tickets).where(and(open, isNull(tickets.assigneeId), inArray(tickets.priority, ["HIGH", "URGENT"]))).orderBy(desc(tickets.updatedAt)).limit(5),
      db.select(ticketCols).from(tickets).where(and(open, notInArray(tickets.status, ["TODO", "BACKLOG"]), lt(tickets.updatedAt, weekAgo))).orderBy(asc(tickets.updatedAt)).limit(5),
      db
        .select({ n: sql<number>`count(distinct ${ticketActivity.ticketId})` })
        .from(ticketActivity)
        .innerJoin(tickets, eq(tickets.id, ticketActivity.ticketId))
        .where(and(live, eq(ticketActivity.action, "status_changed"), inArray(ticketActivity.toValue, DONE_STATUSES), gte(ticketActivity.createdAt, weekAgo))),
    ]);

    let total = 0;
    let done = 0;
    let notStarted = 0;
    for (const row of byStatus) {
      const n = Number(row.n);
      total += n;
      if (isDoneStatus(row.status)) done += n;
      else if (isNotStartedStatus(row.status)) notStarted += n;
    }

    const [{ n: overdueCount }] = await db.select({ n: count() }).from(tickets).where(and(open, lt(tickets.dueDate, today)));
    const health = computeHealth({
      projectStatus: project?.status ?? null,
      startDate: project?.startDate ?? null,
      endDate: project?.endDate ?? null,
      total,
      done,
      overdue: Number(overdueCount),
    });

    return ok({
      counts: {
        total,
        open: total - done,
        inProgress: total - done - notStarted,
        overdue: Number(overdueCount),
        doneThisWeek: Number(doneThisWeek[0]?.n ?? 0),
      },
      health,
      projectKey: project?.key ?? null,
      attention: { overdue, unassignedUrgent, stale },
    });
  });
}
