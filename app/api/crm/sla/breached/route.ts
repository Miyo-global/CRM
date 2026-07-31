import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and, lt, isNotNull, sql } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    const now = new Date();
    const data = await db
      .select({
        id: leads.id,
        name: leads.name,
        email: leads.email,
        status: leads.status,
        priority: leads.priority,
        slaDeadline: leads.slaDeadline,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .where(
        and(
          eq(leads.orgId, session.orgId),
          isNotNull(leads.slaDeadline),
          lt(leads.slaDeadline, now),
          sql`${leads.status} NOT IN ('CONVERTED', 'LOST')`,
        ),
      )
      .limit(100);
    return ok(data);
  });
}
