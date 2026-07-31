import { type NextRequest } from "next/server";
import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tasks, users } from "@/lib/db/schema";
import { eq, and, count, lt, gte, lte, isNotNull, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = new URL(req.url);
    const days = Math.min(Number(searchParams.get("days") ?? 30), 90);

    const orgId = session.orgId;
    const now = new Date();
    const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [{ total }] = await db
      .select({ total: count() })
      .from(tasks)
      .where(and(eq(tasks.orgId, orgId), gte(tasks.createdAt, periodStart)));

    const [{ completed }] = await db
      .select({ completed: count() })
      .from(tasks)
      .where(
        and(eq(tasks.orgId, orgId), eq(tasks.status, "completed"), gte(tasks.createdAt, periodStart))
      );

    const [{ overdue }] = await db
      .select({ overdue: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.orgId, orgId),
          eq(tasks.status, "pending"),
          lt(tasks.dueDate, now),
          isNotNull(tasks.dueDate)
        )
      );

    const perRep = await db
      .select({
        assigneeId: tasks.assigneeId,
        firstName: users.firstName,
        lastName: users.lastName,
        name: users.name,
        total: count(),
        completed: sql<number>`SUM(CASE WHEN ${tasks.status} = 'completed' THEN 1 ELSE 0 END)`,
        overdue: sql<number>`SUM(CASE WHEN ${tasks.status} = 'pending' AND ${tasks.dueDate} < NOW() THEN 1 ELSE 0 END)`,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(
        and(eq(tasks.orgId, orgId), isNotNull(tasks.assigneeId), gte(tasks.createdAt, periodStart))
      )
      .groupBy(tasks.assigneeId, users.firstName, users.lastName, users.name)
      .orderBy(sql`SUM(CASE WHEN ${tasks.status} = 'completed' THEN 1 ELSE 0 END) DESC`)
      .limit(20);

    const totalNum = Number(total);
    const completedNum = Number(completed);
    const overdueNum = Number(overdue);

    return ok({
      period: days,
      total: totalNum,
      completed: completedNum,
      overdue: overdueNum,
      completionRate: totalNum > 0 ? Math.round((completedNum / totalNum) * 100) : 0,
      perRep: perRep.map((r) => ({
        assigneeId: r.assigneeId,
        name:
          r.firstName && r.lastName
            ? `${r.firstName} ${r.lastName}`
            : (r.name ?? "Unknown"),
        total: Number(r.total),
        completed: Number(r.completed),
        overdue: Number(r.overdue),
        completionRate:
          Number(r.total) > 0
            ? Math.round((Number(r.completed) / Number(r.total)) * 100)
            : 0,
      })),
    });
  });
}
