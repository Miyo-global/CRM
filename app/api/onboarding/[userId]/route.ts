import { type NextRequest } from "next/server";
import { eq, and } from "drizzle-orm";
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
    const isAdmin = role === "CEO" || role === "HR" || role === "ADMIN";

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
      .orderBy(onboardingTasks.createdAt);

    return ok(tasks);
  });
}
