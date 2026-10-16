import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cycles, tickets, users } from "@/lib/db/schema";
import { isDoneStatus } from "@/lib/projects/project-health";

export async function loadCycleDetail(orgId: string, projectId: number, cycleId: number) {
  const scope = and(eq(cycles.projectId, projectId), eq(cycles.orgId, orgId));
  const cycle = await db.query.cycles.findFirst({
    where: and(scope, eq(cycles.id, cycleId)),
    columns: { id: true, name: true, description: true, status: true, startDate: true, endDate: true },
  });
  if (!cycle) return null;

  const [rows, others, velocity] = await Promise.all([
    db
      .select({
        id: tickets.id,
        title: tickets.title,
        ticketNumber: tickets.ticketNumber,
        status: tickets.status,
        priority: tickets.priority,
        points: tickets.points,
        assigneeName: sql<string | null>`coalesce(${users.name}, nullif(trim(concat(${users.firstName}, ' ', ${users.lastName})), ''))`,
      })
      .from(tickets)
      .leftJoin(users, eq(users.id, tickets.assigneeId))
      .where(and(eq(tickets.cycleId, cycleId), eq(tickets.projectId, projectId), isNull(tickets.deletedAt)))
      .orderBy(asc(tickets.status), asc(tickets.rank))
      .limit(500),
    db.query.cycles.findMany({
      where: and(scope, sql`${cycles.status} <> 'completed'`, sql`${cycles.id} <> ${cycleId}`),
      columns: { id: true, name: true, status: true },
      orderBy: [asc(cycles.startDate)],
      limit: 50,
    }),
    db
      .select({
        cycleId: cycles.id,
        name: cycles.name,
        points: sql<number>`coalesce(sum(${tickets.points}) filter (where upper(${tickets.status}) in ('DONE','CLOSED','COMPLETED','RESOLVED')), 0)`,
      })
      .from(cycles)
      .leftJoin(tickets, and(eq(tickets.cycleId, cycles.id), isNull(tickets.deletedAt)))
      .where(and(scope, eq(cycles.status, "completed")))
      .groupBy(cycles.id, cycles.name, cycles.endDate)
      .orderBy(desc(cycles.endDate))
      .limit(6),
  ]);

  const done = rows.filter((t) => isDoneStatus(t.status));
  return {
    cycle,
    tickets: rows,
    stats: {
      total: rows.length,
      done: done.length,
      points: rows.reduce((s, t) => s + (t.points ?? 0), 0),
      donePoints: done.reduce((s, t) => s + (t.points ?? 0), 0),
    },
    carryTargets: others,
    velocity: velocity.reverse().map((v) => ({ ...v, points: Number(v.points) })),
  };
}
