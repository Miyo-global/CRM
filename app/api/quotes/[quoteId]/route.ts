import { type NextRequest } from "next/server";
import { withAuth, withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { quotes, quoteLineItems, users, deals, clientAccounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit-log";
import { ROLES } from "@/lib/constants/roles";
import { z } from "zod";

const ALLOWED_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  DRAFT: ["SENT", "EXPIRED"],
  SENT: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
};

const updateSchema = z.object({
  subject: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]).optional(),
  validUntil: z.string().optional(),
  termsAndConditions: z.string().optional(),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().min(0),
    unitPrice: z.number().min(0),
    taxRate: z.number().min(0).optional(),
  })).optional(),
});

type Ctx = { params: Promise<{ quoteId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { quoteId: id } = await ctx.params;
  const quoteId = Number(id);
  if (!Number.isFinite(quoteId)) return err("Invalid quote id", 400);

  return withAuth(async (session) => {
    const quote = await db.query.quotes.findFirst({
      where: and(eq(quotes.id, quoteId), eq(quotes.orgId, session.orgId)),
      with: {
        lineItems: { orderBy: (li, { asc }) => [asc(li.displayOrder)] },
        createdBy: { columns: { id: true, name: true, image: true } },
        deal: { columns: { id: true, name: true } },
        client: { columns: { id: true, clientName: true } },
      },
    });
    if (!quote) return err("Quote not found", 404);
    return ok(quote);
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { quoteId: id } = await ctx.params;
  const quoteId = Number(id);
  if (!Number.isFinite(quoteId)) return err("Invalid quote id", 400);

  return withAuth(async (session) => {
    const role = session.user.role ?? "";
    if (role !== ROLES.CEO && role !== ROLES.ADMIN && role !== ROLES.HR && role !== ROLES.SALES) {
      return err("You do not have permission to update quotes", 403);
    }

    const input = await parseBody(req, updateSchema);

    const existing = await db.query.quotes.findFirst({
      where: and(eq(quotes.id, quoteId), eq(quotes.orgId, session.orgId)),
    });
    if (!existing) return err("Quote not found", 404);

    if (input.status !== undefined && input.status !== existing.status) {
      const allowed = ALLOWED_STATUS_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(input.status)) {
        return err(`Cannot change quote status from ${existing.status} to ${input.status}`, 400);
      }
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (input.subject !== undefined) updateData.subject = input.subject;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.validUntil !== undefined) updateData.validUntil = input.validUntil;
    if (input.termsAndConditions !== undefined) updateData.termsAndConditions = input.termsAndConditions;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.rejectionReason !== undefined) updateData.rejectionReason = input.rejectionReason;

    if (input.status !== undefined) {
      updateData.status = input.status;
      if (input.status === "SENT") updateData.sentAt = new Date();
      if (input.status === "ACCEPTED") updateData.acceptedAt = new Date();
      if (input.status === "REJECTED") updateData.rejectedAt = new Date();
    }

    if (input.lineItems) {
      let totalAmount = 0;
      let totalTax = 0;
      for (const item of input.lineItems) {
        const lineAmount = item.quantity * item.unitPrice;
        totalAmount += lineAmount;
        totalTax += lineAmount * ((item.taxRate ?? 0) / 100);
      }
      updateData.totalAmount = totalAmount.toFixed(2);
      updateData.taxAmount = totalTax.toFixed(2);
      updateData.netAmount = (totalAmount + totalTax).toFixed(2);
    }

    const lineItems = input.lineItems;
    const [updated] = await db.transaction(async (tx) => {
      if (lineItems) {
        await tx.delete(quoteLineItems).where(eq(quoteLineItems.quoteId, quoteId));
        await tx.insert(quoteLineItems).values(
          lineItems.map((item, idx) => ({
            quoteId,
            description: item.description,
            quantity: item.quantity.toFixed(2),
            unitPrice: item.unitPrice.toFixed(2),
            amount: (item.quantity * item.unitPrice).toFixed(2),
            taxRate: (item.taxRate ?? 0).toFixed(2),
            displayOrder: idx,
          }))
        );
      }

      return tx.update(quotes)
        .set(updateData)
        .where(and(eq(quotes.id, quoteId), eq(quotes.orgId, session.orgId)))
        .returning();
    });

    void createAuditLog({
      action: input.status ? `quote.${input.status === "ACCEPTED" ? "accepted" : input.status === "REJECTED" ? "rejected" : "updated"}` as "quote.updated" : "quote.updated",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(quoteId),
      targetType: "quote",
      metadata: { changedFields: Object.keys(input), newStatus: input.status },
    }).catch(() => {});

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { quoteId: id } = await ctx.params;
  const quoteId = Number(id);
  if (!Number.isFinite(quoteId)) return err("Invalid quote id", 400);

  return withAdmin(async (session) => {
    const existing = await db.query.quotes.findFirst({
      where: and(eq(quotes.id, quoteId), eq(quotes.orgId, session.orgId)),
      columns: { quoteNumber: true },
    });
    if (!existing) return err("Quote not found", 404);

    await db.delete(quotes)
      .where(and(eq(quotes.id, quoteId), eq(quotes.orgId, session.orgId)));

    void createAuditLog({
      action: "quote.deleted",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(quoteId),
      targetType: "quote",
      metadata: { quoteNumber: existing.quoteNumber },
    }).catch(() => {});

    return ok({ success: true });
  });
}
