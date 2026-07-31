import { type NextRequest } from "next/server";
import { withAdmin, ok, err, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { crmDeals, crmPeople } from "@/lib/db/schema";
import { eq, and, gte, lte, count, sql, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { startOfMonth, subMonths, endOfMonth } from "date-fns";

const schema = z.object({
  rep1: z.string(),
  rep2: z.string(),
  from: z.string().optional(),
  to: z.string().optional(),
});

interface RepMonthStat {
  month: string;
  dealsWon: number;
  revenue: number;
}

interface RepComparisonData {
  repId: number;
  name: string;
  initials: string;
  dealsWon: number;
  totalDeals: number;
  revenue: number;
  winRate: number;
  avgDealSize: number;
  monthly: RepMonthStat[];
}


export async function GET(req: NextRequest) {
  return withAdmin(async (session) => {
    const parsed = parseQuery(req, schema);
    if (!parsed.rep1 || !parsed.rep2) return err("rep1 and rep2 required", 400);

    const rep1Id = Number(parsed.rep1);
    const rep2Id = Number(parsed.rep2);
    if (!Number.isFinite(rep1Id) || !Number.isFinite(rep2Id)) return err("Invalid rep IDs", 400);

    const from = parsed.from ? new Date(parsed.from) : subMonths(new Date(), 6);
    const to = parsed.to ? new Date(parsed.to) : new Date();

    async function getRepStats(repId: number): Promise<RepComparisonData | null> {
      const person = await db.query.crmPeople.findFirst({
        where: and(eq(crmPeople.id, repId), eq(crmPeople.orgId, session.orgId)),
        columns: { id: true, name: true, initials: true },
      });
      if (!person) return null;

      const baseWhere = and(
        eq(crmDeals.orgId, session.orgId),
        eq(crmDeals.salesRepId, repId),
        gte(crmDeals.createdAt, from),
        lte(crmDeals.createdAt, to),
      );

      const [wonStats] = await db
        .select({
          deals: count(),
          revenue: sql<number>`COALESCE(sum(${crmDeals.value}::numeric), 0)::float`,
        })
        .from(crmDeals)
        .where(and(baseWhere, eq(crmDeals.stage, "Closed Won")));

      const [totalStats] = await db
        .select({ total: count() })
        .from(crmDeals)
        .where(baseWhere);

      const dealsWon = wonStats?.deals ?? 0;
      const totalDeals = totalStats?.total ?? 0;
      const revenue = Number(wonStats?.revenue ?? 0);

      const monthly: RepMonthStat[] = [];
      for (let i = 5; i >= 0; i--) {
        const mStart = startOfMonth(subMonths(new Date(), i));
        const mEnd = endOfMonth(subMonths(new Date(), i));
        const label = `${mStart.toLocaleString("en", { month: "short" })} '${String(mStart.getFullYear()).slice(2)}`;

        const [mStats] = await db
          .select({
            deals: count(),
            revenue: sql<number>`COALESCE(sum(${crmDeals.value}::numeric), 0)::float`,
          })
          .from(crmDeals)
          .where(
            and(
              eq(crmDeals.orgId, session.orgId),
              eq(crmDeals.salesRepId, repId),
              eq(crmDeals.stage, "Closed Won"),
              gte(crmDeals.createdAt, mStart),
              lte(crmDeals.createdAt, mEnd),
            ),
          );

        monthly.push({ month: label, dealsWon: mStats?.deals ?? 0, revenue: Number(mStats?.revenue ?? 0) });
      }

      return {
        repId: person.id,
        name: person.name ?? "Unknown",
        initials: person.initials ?? "?",
        dealsWon,
        totalDeals,
        revenue,
        winRate: totalDeals > 0 ? Math.round((dealsWon / totalDeals) * 1000) / 10 : 0,
        avgDealSize: dealsWon > 0 ? Math.round(revenue / dealsWon) : 0,
        monthly,
      };
    }

    const [rep1Data, rep2Data] = await Promise.all([getRepStats(rep1Id), getRepStats(rep2Id)]);
    if (!rep1Data || !rep2Data) return err("One or both reps not found", 404);

    return ok({ rep1: rep1Data, rep2: rep2Data });
  });
}
