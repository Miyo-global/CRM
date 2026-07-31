import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { aiUsageLogs } from "@/lib/db/schema";
import { eq, gte, sum, sql, desc } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { subDays } from "date-fns";

export async function GET() {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Forbidden", 403);
    }

    const since = subDays(new Date(), 30);

    const [totals, byFeature, daily] = await Promise.all([
      db
        .select({
          totalTokens: sum(aiUsageLogs.totalTokens).mapWith(Number),
          promptTokens: sum(aiUsageLogs.promptTokens).mapWith(Number),
          completionTokens: sum(aiUsageLogs.completionTokens).mapWith(Number),
          estimatedCostUsd: sql<string>`COALESCE(SUM(${aiUsageLogs.estimatedCostUsd}), 0)::text`,
          requestCount: sql<number>`COUNT(*)::int`,
        })
        .from(aiUsageLogs)
        .where(eq(aiUsageLogs.orgId, session.orgId)),

      db
        .select({
          feature: aiUsageLogs.feature,
          model: aiUsageLogs.model,
          totalTokens: sum(aiUsageLogs.totalTokens).mapWith(Number),
          estimatedCostUsd: sql<string>`COALESCE(SUM(${aiUsageLogs.estimatedCostUsd}), 0)::text`,
          requestCount: sql<number>`COUNT(*)::int`,
        })
        .from(aiUsageLogs)
        .where(eq(aiUsageLogs.orgId, session.orgId))
        .groupBy(aiUsageLogs.feature, aiUsageLogs.model)
        .orderBy(desc(sql`SUM(${aiUsageLogs.totalTokens})`)),

      db
        .select({
          date: sql<string>`DATE(${aiUsageLogs.createdAt})::text`,
          totalTokens: sum(aiUsageLogs.totalTokens).mapWith(Number),
          estimatedCostUsd: sql<string>`COALESCE(SUM(${aiUsageLogs.estimatedCostUsd}), 0)::text`,
          requestCount: sql<number>`COUNT(*)::int`,
        })
        .from(aiUsageLogs)
        .where(eq(aiUsageLogs.orgId, session.orgId))
        .groupBy(sql`DATE(${aiUsageLogs.createdAt})`)
        .orderBy(desc(sql`DATE(${aiUsageLogs.createdAt})`))
        .limit(30),
    ]);

    return ok({
      totals: totals[0] ?? {
        totalTokens: 0,
        promptTokens: 0,
        completionTokens: 0,
        estimatedCostUsd: "0",
        requestCount: 0,
      },
      byFeature,
      daily,
    });
  });
}
