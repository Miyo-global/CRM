import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { addDays } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);
    const baseWhere = isAdmin
      ? and(eq(documents.orgId, session.orgId), eq(documents.isActive, true))
      : and(
          eq(documents.orgId, session.orgId),
          eq(documents.userId, session.user.id),
          eq(documents.isActive, true),
        );

    const [byType, total, expiringCount] = await Promise.all([
      db
        .select({ type: documents.type, count: count() })
        .from(documents)
        .where(baseWhere)
        .groupBy(documents.type),
      db.select({ count: count() }).from(documents).where(baseWhere),
      db.select({ count: count() }).from(documents).where(
        and(
          baseWhere,
          sql`${documents.expiryDate} IS NOT NULL`,
          sql`${documents.expiryDate} <= ${addDays(new Date(), 30).toISOString().slice(0, 10)}`,
          sql`${documents.expiryDate} >= CURRENT_DATE`,
        ),
      ),
    ]);

    return ok({
      total: total[0]?.count ?? 0,
      byType: Object.fromEntries(byType.map((r) => [r.type, r.count])),
      expiringIn30Days: expiringCount[0]?.count ?? 0,
    });
  });
}
