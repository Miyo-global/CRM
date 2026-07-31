import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, isNotNull, sql, count } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    const now = new Date();

    const [totals] = await db
      .select({
        total: count(),
      })
      .from(leads)
      .where(
        and(
          eq(leads.orgId, session.orgId),
          isNotNull(leads.slaDeadline),
          sql`${leads.status} NOT IN ('CONVERTED', 'LOST')`,
        ),
      );

    const [breached] = await db
      .select({
        count: count(),
      })
      .from(leads)
      .where(
        and(
          eq(leads.orgId, session.orgId),
          isNotNull(leads.slaDeadline),
          sql`${leads.slaDeadline} < ${now.toISOString()}`,
          sql`${leads.status} NOT IN ('CONVERTED', 'LOST')`,
        ),
      );

    const total = totals?.total ?? 0;
    const breachedCount = breached?.count ?? 0;
    const compliant = total - breachedCount;
    const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 100;

    return ok({
      total,
      compliant,
      breached: breachedCount,
      complianceRate,
    });
  });
}
