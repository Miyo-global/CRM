import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { onboardingTasks, users } from "@/lib/db/schema";
import { eq, count, inArray, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAdmin(async (session) => {
    const orgId = session.orgId;

    const taskStats = await db
      .select({
        userId: onboardingTasks.userId,
        total: count(),
        completed: sql<number>`SUM(CASE WHEN ${onboardingTasks.status} = 'COMPLETED' THEN 1 ELSE 0 END)`,
      })
      .from(onboardingTasks)
      .where(eq(onboardingTasks.orgId, orgId))
      .groupBy(onboardingTasks.userId);

    if (taskStats.length === 0) {
      return ok({ inProgress: 0, completed: 0, total: 0, completionPct: 0, newHires: [] });
    }

    let inProgress = 0;
    let completedCount = 0;
    const inProgressIds: string[] = [];

    for (const stat of taskStats) {
      const done = Number(stat.completed);
      const tot = Number(stat.total);
      if (tot > 0 && done >= tot) {
        completedCount++;
      } else {
        inProgress++;
        inProgressIds.push(stat.userId);
      }
    }

    const total = inProgress + completedCount;
    const completionPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    const newHires: {
      userId: string;
      name: string;
      completedTasks: number;
      totalTasks: number;
      pct: number;
    }[] = [];

    const previewIds = inProgressIds.slice(0, 5);
    if (previewIds.length > 0) {
      const userDetails = await db
        .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, name: users.name })
        .from(users)
        .where(inArray(users.id, previewIds));

      const statsByUser = Object.fromEntries(taskStats.map((s) => [s.userId, s]));

      for (const u of userDetails) {
        const stat = statsByUser[u.id];
        if (!stat) continue;
        const completedTasks = Number(stat.completed);
        const totalTasks = Number(stat.total);
        const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const name =
          u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : (u.name ?? "Unknown");
        newHires.push({ userId: u.id, name, completedTasks, totalTasks, pct });
      }
    }

    return ok({ inProgress, completed: completedCount, total, completionPct, newHires });
  });
}
