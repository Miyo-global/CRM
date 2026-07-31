import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit-log";
import { ROLES } from "@/lib/constants/roles";
import { notifyByRoles } from "@/server/actions/create-notification";

type Ctx = { params: Promise<{ quoteId: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  const { quoteId: id } = await ctx.params;
  const quoteId = Number(id);
  if (!Number.isFinite(quoteId)) return err("Invalid quote id", 400);

  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (role !== ROLES.CEO && role !== ROLES.ADMIN && role !== ROLES.HR && role !== ROLES.SALES) {
      return err("You do not have permission to send quotes", 403);
    }

    const existing = await db.query.quotes.findFirst({
      where: and(eq(quotes.id, quoteId), eq(quotes.orgId, session.orgId)),
    });

    if (!existing) return err("Quote not found", 404);
    if (existing.status !== "DRAFT") {
      return err("Only draft quotes can be sent", 400);
    }

    const [updated] = await db.update(quotes)
      .set({ status: "SENT", sentAt: new Date(), updatedAt: new Date() })
      .where(and(eq(quotes.id, quoteId), eq(quotes.orgId, session.orgId)))
      .returning();

    void notifyByRoles(session.orgId, [ROLES.CEO, ROLES.SALES], {
      type: "INFO",
      title: "Quote Sent",
      message: `Quote ${existing.quoteNumber} (${existing.subject}) was sent.`,
      link: `/crm/quotes/${quoteId}`,
      metadata: { quoteId },
      excludeUserId: session.user.id,
    }).catch(() => {});

    void createAuditLog({
      action: "quote.sent",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(quoteId),
      targetType: "quote",
      metadata: { quoteNumber: existing.quoteNumber },
    }).catch(() => {});

    return ok(updated);
  });
}
