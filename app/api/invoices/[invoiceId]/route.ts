import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { getInvoice } from "@/server/queries/invoice";
import { db } from "@/lib/db";
import { invoices, payments } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { ROLES } from "@/lib/constants/roles";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().min(1).max(999999),
  rate: z.number().positive().max(999999999.99),
  amount: z.number().min(0).max(999999999.99),
});

const updateSchema = z.object({
  clientId: z.number().optional(),
  projectId: z.number().optional(),
  lineItems: z.array(lineItemSchema).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  discount: z.number().min(0).optional(),
  currency: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { invoiceId: id } = await params;
      const invoiceId = Number(id);
      if (!Number.isFinite(invoiceId)) return err("Invalid ID", 400);

      const invoice = await getInvoice(session.orgId, invoiceId);
      if (!invoice) return err("Invoice not found", 404);
      return ok(invoice);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load invoice",
        500
      );
    }
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const role = session.user.role ?? "";
      if (role !== ROLES.CEO && role !== ROLES.ADMIN && role !== ROLES.HR && role !== ROLES.SALES) {
        return err("You do not have permission to update invoices", 403);
      }

      const { invoiceId: id } = await params;
      const invoiceId = Number(id);
      if (!Number.isFinite(invoiceId)) return err("Invalid ID", 400);

      const existing = await db.query.invoices.findFirst({
        where: and(
          eq(invoices.id, invoiceId),
          eq(invoices.orgId, session.orgId)
        ),
      });
      if (!existing) return err("Invoice not found", 404);

      const body = await req.json();
      const input = updateSchema.parse(body);

      if (input.status) {
        const allowedTransitions: Record<string, string[]> = {
          DRAFT: ["SENT", "CANCELLED"],
          SENT: ["PAID", "OVERDUE", "CANCELLED"],
          OVERDUE: ["PAID", "CANCELLED"],
          PAID: [],
          CANCELLED: [],
        };
        if (
          input.status !== existing.status &&
          !(allowedTransitions[existing.status] ?? []).includes(input.status)
        ) {
          return err(
            `Cannot change invoice status from ${existing.status} to ${input.status}`,
            400
          );
        }

        if (input.status === "PAID") {
          const [paidResult] = await db
            .select({
              paid: sql<string>`COALESCE(SUM(${payments.amount}), 0)`,
            })
            .from(payments)
            .where(
              and(
                eq(payments.invoiceId, invoiceId),
                eq(payments.orgId, session.orgId)
              )
            );
          const totalPaid = Number(paidResult?.paid ?? 0);
          if (totalPaid + 0.01 < Number(existing.total ?? 0)) {
            return err(
              "Invoice cannot be marked paid until full payment is recorded",
              400
            );
          }
        }

        const updateData: Record<string, unknown> = {
          status: input.status,
          updatedAt: new Date(),
        };
        if (input.status === "SENT") updateData.sentAt = new Date();
        if (input.status === "PAID") updateData.paidAt = new Date();

        await db
          .update(invoices)
          .set(updateData)
          .where(
            and(
              eq(invoices.id, invoiceId),
              eq(invoices.orgId, session.orgId)
            )
          );
        return ok({ success: true });
      }

      if (existing.status !== "DRAFT") {
        return err("Only draft invoices can be edited", 400);
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.clientId !== undefined) updateData.clientId = input.clientId;
      if (input.projectId !== undefined) updateData.projectId = input.projectId;
      if (input.currency !== undefined) updateData.currency = input.currency;
      if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
      if (input.notes !== undefined) updateData.notes = input.notes;

      if (input.lineItems) {
        const lineItems = input.lineItems.map((item) => ({
          ...item,
          amount: Number((item.quantity * item.rate).toFixed(2)),
        }));
        const subtotal = Number(
          lineItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)
        );
        const taxRate = input.taxRate ?? Number(existing.taxRate ?? 0);
        const discount = input.discount ?? Number(existing.discount ?? 0);
        const taxAmount = Number((subtotal * (taxRate / 100)).toFixed(2));
        if (discount > subtotal + taxAmount) {
          return err("Discount cannot exceed the invoice subtotal plus tax", 400);
        }
        const total = Number(
          Math.max(0, subtotal + taxAmount - discount).toFixed(2)
        );

        updateData.lineItems = lineItems;
        updateData.subtotal = subtotal.toString();
        updateData.taxRate = taxRate.toString();
        updateData.taxAmount = taxAmount.toString();
        updateData.discount = discount.toString();
        updateData.total = total.toString();
      }

      await db
        .update(invoices)
        .set(updateData)
        .where(
          and(eq(invoices.id, invoiceId), eq(invoices.orgId, session.orgId))
        );

      return ok({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) throw error;
      return err("Failed to update invoice", 500);
    }
  });
}
