import { type NextRequest } from "next/server";
import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { deals } from "@/lib/db/schema";
import { eq, and, isNotNull, count, sum } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withAdmin(async (session) => {
    const { searchParams } = new URL(req.url);
    const repId = searchParams.get("repId");

    const cacheKey = `sales:lost-analysis:${session.orgId}:${repId ?? "all"}`;

    const data = await cached(
      cacheKey,
      async () => {
        const conditions = [
          eq(deals.orgId, session.orgId),
          eq(deals.stage, "LOST"),
        ];

        if (repId) conditions.push(eq(deals.assignedToId, repId));

        const [lostDeals, lostByReason] = await Promise.all([
          db
            .select({ count: count(), totalValue: sum(deals.value) })
            .from(deals)
            .where(and(...conditions)),

          db
            .select({
              reason: deals.lostReason,
              count: count(),
              totalValue: sum(deals.value),
            })
            .from(deals)
            .where(and(...conditions))
            .groupBy(deals.lostReason),
        ]);

        const total = Number(lostDeals[0]?.count ?? 0);
        const totalValue = Number(lostDeals[0]?.totalValue ?? 0);

        const reasons = lostByReason
          .map((r) => ({
            reason: r.reason ?? "No reason given",
            count: Number(r.count),
            totalValue: Number(r.totalValue ?? 0),
            pct: total > 0 ? Math.round((Number(r.count) / total) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        return {
          total,
          totalValue,
          reasons,
        };
      },
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );

    return ok(data);
  });
}
