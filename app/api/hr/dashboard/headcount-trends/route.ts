import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { eq, and, lte, isNotNull, sql } from "drizzle-orm";
import { cached, CACHE_TTL } from "@/lib/hr-cache";
import { trendMonths, cumulativeHeadcount } from "@/lib/hr/headcount-trends";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAdmin(async (session) => {
    const orgId = session.orgId;

    const data = await cached(
      `hr:dashboard:headcount-trends:${orgId}`,
      async () => {
        const months = trendMonths();

        // R3-0200: one grouped query instead of 12 per-month counts.
        const joins = await db
          .select({
            joiningDate: users.joiningDate,
            count: sql<number>`count(*)`,
          })
          .from(organizationMembers)
          .innerJoin(users, eq(organizationMembers.userId, users.id))
          .where(
            and(
              eq(organizationMembers.orgId, orgId),
              isNotNull(users.joiningDate),
              lte(users.joiningDate, months[months.length - 1].end),
            ),
          )
          .groupBy(users.joiningDate)
          .orderBy(users.joiningDate);

        return { trends: cumulativeHeadcount(months, joins) };
      },
      { ttlSeconds: CACHE_TTL.LONG },
    );

    return ok(data);
  });
}
