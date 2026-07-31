import { type NextRequest } from "next/server";
import { withAuth, ok, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, count } from "drizzle-orm";
import { z } from "zod";
import { cached, CACHE_TTL } from "@/lib/cache";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

const schema = z.object({
  months: z.string().optional(),
});

interface CohortRow {
  cohortMonth: string;
  created: number;
  converted: number;
  conversionRate: number;
  avgDaysToConvert: number | null;
}


export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { months: monthsStr } = parseQuery(req, schema);
    const numMonths = Math.min(Number(monthsStr ?? 6), 12);

    const cacheKey = `cohort:${session.orgId}:${numMonths}`;
    const data = await cached<CohortRow[]>(
      cacheKey,
      async () => {
        const rows: CohortRow[] = [];

        for (let i = numMonths - 1; i >= 0; i--) {
          const monthStart = startOfMonth(subMonths(new Date(), i));
          const monthEnd = endOfMonth(subMonths(new Date(), i));
          const label = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;

          const [stats] = await db
            .select({
              created: count(leads.id),
              converted: sql<number>`count(*) filter (where ${leads.convertedAt} is not null)`,
              avgDays: sql<number | null>`
                round(avg(
                  extract(epoch from ${leads.convertedAt} - ${leads.createdAt}) / 86400.0
                ) filter (where ${leads.convertedAt} is not null))
              `,
            })
            .from(leads)
            .where(
              and(
                eq(leads.orgId, session.orgId),
                gte(leads.createdAt, monthStart),
                lte(leads.createdAt, monthEnd),
                sql`${leads.deletedAt} IS NULL`,
              ),
            );

          const created = Number(stats?.created ?? 0);
          const converted = Number(stats?.converted ?? 0);

          rows.push({
            cohortMonth: label,
            created,
            converted,
            conversionRate: created > 0 ? Math.round((converted / created) * 100) : 0,
            avgDaysToConvert: stats?.avgDays ? Number(stats.avgDays) : null,
          });
        }

        return rows;
      },
      { ttlSeconds: CACHE_TTL.MEDIUM },
    );

    return ok(data);
  });
}
