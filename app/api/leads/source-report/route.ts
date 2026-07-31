import { withAuth, ok } from "@/lib/api/helpers";
import { cached, CACHE_TTL } from "@/lib/cache";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";


export async function GET() {
  return withAuth(async (session) => {
    const data = await cached(
      `leads:source-report:${session.orgId}`,
      async () => {
        const rows = await db
          .select({
            source: sql<string>`COALESCE(${leads.source}::text, 'other')`,
            count: sql<number>`count(*)::int`,
            converted: sql<number>`count(*) FILTER (WHERE ${leads.status} = 'CONVERTED')::int`,
            totalValue: sql<number>`COALESCE(SUM(${leads.potentialValue}::numeric), 0)::float`,
          })
          .from(leads)
          .where(and(eq(leads.orgId, session.orgId), isNull(leads.deletedAt)))
          .groupBy(sql`COALESCE(${leads.source}::text, 'other')`)
          .orderBy(sql`count(*) desc`);

        const total = rows.reduce((sum, r) => sum + r.count, 0);

        const sources = rows.map((r) => ({
          source: r.source,
          count: r.count,
          converted: r.converted,
          conversionRate: r.count > 0 ? Math.round((r.converted / r.count) * 100) : 0,
          totalValue: r.totalValue,
        }));

        return { sources, total };
      },
      { ttlSeconds: CACHE_TTL.MEDIUM }
    );

    return ok(data);
  });
}
