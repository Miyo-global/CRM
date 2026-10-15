import { type NextRequest } from "next/server";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { onboardingTasks, users, organizationMembers } from "@/lib/db/schema";
import { startOnboardingForUser } from "@/lib/hr/start-onboarding";

export async function GET(_req: NextRequest) {
  return withAdmin(async (session) => {
    const rows = await db
      .select({
        userId: onboardingTasks.userId,
        userName: users.name,
        totalTasks: sql<number>`count(*)::int`,
        completedTasks: sql<number>`sum(case when ${onboardingTasks.status} = 'COMPLETED' then 1 else 0 end)::int`,
        lastCompletedAt: sql<string | null>`max(${onboardingTasks.completedAt})`,
      })
      .from(onboardingTasks)
      .leftJoin(users, eq(onboardingTasks.userId, users.id))
      .where(eq(onboardingTasks.orgId, session.orgId))
      .groupBy(onboardingTasks.userId, users.name);

    const result = rows.map((r) => ({
      userId: r.userId,
      userName: r.userName ?? r.userId,
      totalTasks: r.totalTasks,
      completedTasks: r.completedTasks ?? 0,
      percentComplete:
        r.totalTasks > 0
          ? Math.round(((r.completedTasks ?? 0) / r.totalTasks) * 100)
          : 0,
      lastCompletedAt: r.lastCompletedAt ?? null,
    }));

    return ok(result);
  });
}

const initiateSchema = z.object({
  userId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, initiateSchema);

    const [membership] = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, body.userId),
          eq(organizationMembers.orgId, session.orgId)
        )
      );

    if (!membership) {
      return err("User not found in this organization", 404);
    }

    const [targetUser] = await db
      .select({ id: users.id, joiningDate: users.joiningDate })
      .from(users)
      .where(eq(users.id, body.userId));

    const result = await startOnboardingForUser({
      orgId: session.orgId,
      userId: body.userId,
      joiningDate: targetUser?.joiningDate ?? null,
    });

    if (result.alreadyStarted) {
      return err("Onboarding already initiated for this user", 409);
    }

    return ok({ success: true, tasksCreated: result.tasksCreated });
  });
}
