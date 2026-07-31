import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { goals, keyResults } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    const myGoals = await db.query.goals.findMany({
      where: and(eq(goals.orgId, session.orgId), eq(goals.userId, session.user.id)),
      orderBy: [desc(goals.createdAt)],
    });

    const goalIds = myGoals.map((g) => g.id);
    const allKeyResults = goalIds.length > 0
      ? await db.query.keyResults.findMany({
          where: inArray(keyResults.goalId, goalIds),
        })
      : [];

    return ok({
      goals: myGoals,
      keyResults: allKeyResults,
    });
  });
}
