import { type NextRequest } from "next/server";
import { withRoles, ok, toNumber } from "@/lib/api/helpers";
import { ROLES } from "@/lib/constants/roles";
import { db } from "@/lib/db";
import { emailDeliveries, EMAIL_DELIVERY_STATUSES, type EmailDeliveryStatus } from "@/lib/db/schema";
import { and, desc, eq, ilike, sql } from "drizzle-orm";

/** Outbound email log for the admin's workspace (P2-no-outbound-email-delivery-audit). */
export async function GET(req: NextRequest) {
  // Same audience as the audit log page: CEO and Admin (lib/auth/route-access.ts).
  return withRoles([ROLES.CEO, ROLES.ADMIN])(async (session) => {
    const params = req.nextUrl.searchParams;
    const page = Math.max(1, toNumber(params.get("page")) ?? 1);
    const pageSize = Math.min(100, Math.max(1, toNumber(params.get("pageSize")) ?? 25));
    const status = params.get("status");
    const q = params.get("q")?.trim().slice(0, 200) || undefined;

    const conditions = [eq(emailDeliveries.orgId, session.orgId)];
    if (status && (EMAIL_DELIVERY_STATUSES as readonly string[]).includes(status)) {
      conditions.push(eq(emailDeliveries.status, status as EmailDeliveryStatus));
    }
    if (q) {
      const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
      conditions.push(ilike(emailDeliveries.toAddress, `%${escaped}%`));
    }
    const where = and(...conditions);

    const [rows, [{ count }]] = await Promise.all([
      db
        .select({
          id: emailDeliveries.id,
          toAddress: emailDeliveries.toAddress,
          subject: emailDeliveries.subject,
          templateKey: emailDeliveries.templateKey,
          status: emailDeliveries.status,
          providerMessageId: emailDeliveries.providerMessageId,
          error: emailDeliveries.error,
          createdAt: emailDeliveries.createdAt,
          updatedAt: emailDeliveries.updatedAt,
        })
        .from(emailDeliveries)
        .where(where)
        .orderBy(desc(emailDeliveries.createdAt), desc(emailDeliveries.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ count: sql<number>`count(*)::int` }).from(emailDeliveries).where(where),
    ]);

    return ok({ deliveries: rows, total: count, page, totalPages: Math.max(1, Math.ceil(count / pageSize)) });
  });
}
