import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { resignations, users, organizationMembers, departmentMembers, departments } from "@/lib/db/schema";
import { eq, and, sql, gte, count } from "drizzle-orm";
import { subMonths, format, startOfMonth } from "date-fns";

export async function GET() {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Forbidden", 403);

    const orgId = session.orgId;

    const [totalEmp] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true)));

    const reasonBreakdown = await db
      .select({
        category: resignations.reasonCategory,
        count: sql<number>`count(*)::int`,
      })
      .from(resignations)
      .where(eq(resignations.orgId, orgId))
      .groupBy(resignations.reasonCategory);

    const twelveMonthsAgo = subMonths(new Date(), 12);
    const monthlyTrend = await db
      .select({
        month: sql<string>`to_char(${resignations.createdAt}, 'YYYY-MM')`,
        count: sql<number>`count(*)::int`,
      })
      .from(resignations)
      .where(
        and(
          eq(resignations.orgId, orgId),
          gte(resignations.createdAt, twelveMonthsAgo)
        )
      )
      .groupBy(sql`to_char(${resignations.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${resignations.createdAt}, 'YYYY-MM')`);

    const avgTenure = await db
      .select({
        avgMonths: sql<number>`
          AVG(
            EXTRACT(EPOCH FROM (${resignations.createdAt} - ${users.joiningDate}::timestamp)) / 2592000
          )::int
        `,
      })
      .from(resignations)
      .innerJoin(users, eq(resignations.userId, users.id))
      .where(
        and(
          eq(resignations.orgId, orgId),
          sql`${users.joiningDate} IS NOT NULL`
        )
      );

    const statusCounts = await db
      .select({
        status: resignations.status,
        count: sql<number>`count(*)::int`,
      })
      .from(resignations)
      .where(eq(resignations.orgId, orgId))
      .groupBy(resignations.status);

    const totalEmployees = totalEmp?.count ?? 0;
    const totalResignations = statusCounts.reduce((acc, s) => acc + s.count, 0);
    const attritionRate = totalEmployees > 0 ? Math.round((totalResignations / totalEmployees) * 100) : 0;

    return ok({
      totalEmployees,
      totalResignations,
      attritionRate,
      averageTenureMonths: avgTenure[0]?.avgMonths ?? 0,
      reasonBreakdown: reasonBreakdown.map((r) => ({
        category: r.category ?? "Uncategorized",
        count: r.count,
      })),
      monthlyTrend: monthlyTrend.map((m) => ({
        month: m.month,
        count: m.count,
      })),
      statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, s.count])),
    });
  });
}
