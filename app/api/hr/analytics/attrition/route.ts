import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { resignations, organizationMembers, users } from "@/lib/db/schema";
import { eq, and, gte, sql, count } from "drizzle-orm";

export async function GET() {
  return withAdmin(async (session) => {
    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;

    const [totalEmployees, resignedThisYear, byMonth] = await Promise.all([
      db.select({ count: count() })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(eq(organizationMembers.orgId, session.orgId), eq(users.isActive, true))),

      db.select({ count: count() })
        .from(resignations)
        .where(and(eq(resignations.orgId, session.orgId), gte(resignations.createdAt, new Date(yearStart)))),

      db.select({
        month: sql<string>`to_char(${resignations.createdAt}, 'YYYY-MM')`,
        count: count(),
      })
        .from(resignations)
        .where(and(eq(resignations.orgId, session.orgId), gte(resignations.createdAt, new Date(yearStart))))
        .groupBy(sql`to_char(${resignations.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${resignations.createdAt}, 'YYYY-MM')`),
    ]);

    const total = Number(totalEmployees[0]?.count ?? 0);
    const resigned = Number(resignedThisYear[0]?.count ?? 0);
    const attritionRate = total > 0 ? ((resigned / total) * 100).toFixed(1) : "0.0";

    return ok({
      totalEmployees: total,
      resignedThisYear: resigned,
      attritionRatePercent: attritionRate,
      byMonth: byMonth.map((m) => ({ month: m.month, count: Number(m.count) })),
    });
  });
}
