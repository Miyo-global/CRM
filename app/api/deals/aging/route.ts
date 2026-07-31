import { withAuth, ok } from "@/lib/api/helpers";
import { cached, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { deals, users } from "@/lib/db/schema";
import { eq, and, notInArray, sql } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    const data = await cached(
      `deals:aging:${session.orgId}`,
      async () => {
        const allDeals = await db
          .select({
            id: deals.id,
            name: deals.name,
            value: deals.value,
            stage: deals.stage,
            updatedAt: deals.updatedAt,
            createdAt: deals.createdAt,
            assignedToId: deals.assignedToId,
            assigneeName: users.name,
          })
          .from(deals)
          .leftJoin(users, eq(deals.assignedToId, users.id))
          .where(
            and(
              eq(deals.orgId, session.orgId),
              notInArray(deals.stage, ["WON", "LOST"]),
            ),
          )
          .orderBy(sql`${deals.updatedAt} asc`)
          .limit(100);

        const now = Date.now();
        const enriched = allDeals.map((d) => {
          const updated = d.updatedAt ? new Date(d.updatedAt).getTime() : now;
          const daysInStage = Math.floor((now - updated) / (1000 * 60 * 60 * 24));
          return {
            ...d,
            daysInStage,
            isStale: daysInStage > 14,
            isCritical: daysInStage > 30,
          };
        });

        const stale = enriched.filter((d) => d.isStale).length;
        const critical = enriched.filter((d) => d.isCritical).length;

        return {
          summary: { total: enriched.length, stale, critical },
          deals: enriched,
        };
      },
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );

    return ok(data);
  });
}
