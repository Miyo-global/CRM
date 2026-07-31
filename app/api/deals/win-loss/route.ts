import { withAuth, ok } from "@/lib/api/helpers";
import { cached, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    const data = await cached(
      `deals:win-loss:${session.orgId}`,
      async () => {
        const wonDeals = await db
          .select({
            count: sql<number>`count(*)::int`,
            totalValue: sql<number>`COALESCE(SUM(${deals.value}::numeric), 0)::float`,
          })
          .from(deals)
          .where(and(eq(deals.orgId, session.orgId), eq(deals.stage, "WON")));

        const lostDeals = await db
          .select({
            count: sql<number>`count(*)::int`,
            totalValue: sql<number>`COALESCE(SUM(${deals.value}::numeric), 0)::float`,
          })
          .from(deals)
          .where(and(eq(deals.orgId, session.orgId), eq(deals.stage, "LOST")));

        const lostByReason = await db
          .select({
            reason: sql<string>`COALESCE(${deals.lostReason}, 'Not specified')`,
            count: sql<number>`count(*)::int`,
            totalValue: sql<number>`COALESCE(SUM(${deals.value}::numeric), 0)::float`,
          })
          .from(deals)
          .where(and(eq(deals.orgId, session.orgId), eq(deals.stage, "LOST")))
          .groupBy(sql`COALESCE(${deals.lostReason}, 'Not specified')`)
          .orderBy(sql`count(*) desc`);

        const won = wonDeals[0] ?? { count: 0, totalValue: 0 };
        const lost = lostDeals[0] ?? { count: 0, totalValue: 0 };
        const total = won.count + lost.count;
        const winRate = total > 0 ? Math.round((won.count / total) * 100) : 0;

        return {
          summary: {
            won: won.count,
            wonValue: won.totalValue,
            lost: lost.count,
            lostValue: lost.totalValue,
            total,
            winRate,
          },
          lostByReason: lostByReason.map((r) => ({
            reason: r.reason,
            count: r.count,
            totalValue: r.totalValue,
          })),
        };
      },
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );

    return ok(data);
  });
}
