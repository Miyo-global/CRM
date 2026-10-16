import { type NextRequest } from "next/server";
import { isOnboardingManager } from "@/lib/constants/roles";
import { eq, and, sql } from "drizzle-orm";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { onboardingTasks } from "@/lib/db/schema";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  return withAuth(async (session) => {
    const { userId } = await params;

    const role = session.user.role;
    const isAdmin = isOnboardingManager(role);

    if (!isAdmin && session.user.id !== userId) {
      return err("Forbidden", 403);
    }

    const tasks = await db
      .select()
      .from(onboardingTasks)
      .where(
        and(
          eq(onboardingTasks.userId, userId),
          eq(onboardingTasks.orgId, session.orgId)
        )
      )
      // Due date first, so the list reads as a schedule rather than in
      // creation order (QA-0072). Undated tasks sort last.
      .orderBy(
        sql`${onboardingTasks.dueDate} asc nulls last`,
        onboardingTasks.title,
      );

    return ok(tasks);
  });
}
