import { withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { organizationMembers, users, resignations, terminations } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, count } from "drizzle-orm";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withAdmin(async (session) => {
    const { searchParams } = req.nextUrl;
    const from = searchParams.get("from") ?? `${new Date().getFullYear()}-01-01`;
    const to = searchParams.get("to") ?? `${new Date().getFullYear()}-12-31`;
    const fromTs = new Date(`${from}T00:00:00.000Z`);
    const toTs = new Date(`${to}T23:59:59.999Z`);

    const [headcountRow, joinerRows, resignationRows, terminationRows] = await Promise.all([
      db
        .select({ count: count() })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(eq(organizationMembers.orgId, session.orgId), eq(users.isActive, true))),

      db
        .select({
          month: sql<string>`to_char(${users.joiningDate}::date, 'YYYY-MM')`,
          count: count(),
        })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(
          and(
            eq(organizationMembers.orgId, session.orgId),
            gte(users.joiningDate, from),
            lte(users.joiningDate, to),
          ),
        )
        .groupBy(sql`to_char(${users.joiningDate}::date, 'YYYY-MM')`)
        .orderBy(sql`to_char(${users.joiningDate}::date, 'YYYY-MM')`),

      db
        .select({
          month: sql<string>`to_char(${resignations.createdAt}, 'YYYY-MM')`,
          count: count(),
        })
        .from(resignations)
        .where(
          and(
            eq(resignations.orgId, session.orgId),
            gte(resignations.createdAt, fromTs),
            lte(resignations.createdAt, toTs),
          ),
        )
        .groupBy(sql`to_char(${resignations.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${resignations.createdAt}, 'YYYY-MM')`),

      db
        .select({
          month: sql<string>`to_char(${terminations.effectiveDate}::date, 'YYYY-MM')`,
          count: count(),
        })
        .from(terminations)
        .where(
          and(
            eq(terminations.orgId, session.orgId),
            gte(terminations.effectiveDate, from),
            lte(terminations.effectiveDate, to),
          ),
        )
        .groupBy(sql`to_char(${terminations.effectiveDate}::date, 'YYYY-MM')`)
        .orderBy(sql`to_char(${terminations.effectiveDate}::date, 'YYYY-MM')`),
    ]);

    const joinersMap = new Map(joinerRows.map((r) => [r.month, Number(r.count)]));
    const exitsMap = new Map<string, number>();
    for (const r of resignationRows) {
      exitsMap.set(r.month, (exitsMap.get(r.month) ?? 0) + Number(r.count));
    }
    for (const r of terminationRows) {
      exitsMap.set(r.month, (exitsMap.get(r.month) ?? 0) + Number(r.count));
    }

    const allMonths = Array.from(new Set([...joinersMap.keys(), ...exitsMap.keys()])).sort();

    return ok({
      currentHeadcount: Number(headcountRow[0]?.count ?? 0),
      monthly: allMonths.map((m) => ({
        month: m,
        joiners: joinersMap.get(m) ?? 0,
        exits: exitsMap.get(m) ?? 0,
      })),
    });
  });
}
