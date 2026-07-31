import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { expenses, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";
import { sendExpenseApprovedEmail, sendExpenseRejectedEmail, sendExpensePaidEmail } from "@/lib/email";
import { updateExpenseDetailsSchema } from "@/lib/validations/expense";

const updateStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PAID"]),
  rejectionReason: z.string().optional(),
});

const updateDetailsSchema = updateExpenseDetailsSchema;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  return withAuth(async (session) => {
    const { expenseId: id } = await params;
    const expenseId = Number(id);
    if (isNaN(expenseId)) return err("Invalid expense ID.", 400);

    const rawBody = await req.json() as Record<string, unknown>;

    if (!rawBody.status) {
      const body = updateDetailsSchema.safeParse(rawBody);
      if (!body.success) return err("Invalid update data.", 400);

      const expense = await db.query.expenses.findFirst({
        where: and(eq(expenses.id, expenseId), eq(expenses.orgId, session.orgId)),
        columns: { id: true, userId: true, status: true, amount: true, expenseDate: true, category: true },
      });
      if (!expense) return err("Expense not found.", 404);

      const isOwner = expense.userId === session.user.id;
      const isAdmin = isAdminOrOwner(session.user.role);
      if (!isOwner && !isAdmin) return err("Not authorized.", 403);
      if (expense.status !== "PENDING" && !isAdmin) return err("Can only edit pending expenses.", 400);

      const financialChange =
        (body.data.amount !== undefined && body.data.amount.toString() !== expense.amount) ||
        (body.data.expenseDate !== undefined && body.data.expenseDate !== expense.expenseDate) ||
        (body.data.category !== undefined && body.data.category !== expense.category);
      const needsReapproval = expense.status !== "PENDING" && financialChange;

      await db.update(expenses).set({
        ...(body.data.category && { category: body.data.category }),
        ...(body.data.amount !== undefined && { amount: body.data.amount.toString() }),
        ...(body.data.description !== undefined && { description: body.data.description }),
        ...(body.data.merchant !== undefined && { merchant: body.data.merchant }),
        ...(body.data.paymentMethod !== undefined && { paymentMethod: body.data.paymentMethod }),
        ...(body.data.expenseDate && { expenseDate: body.data.expenseDate }),
        ...(body.data.receiptUrl !== undefined && { receiptUrl: body.data.receiptUrl }),
        ...(body.data.receiptFileName !== undefined && { receiptFileName: body.data.receiptFileName }),
        ...(needsReapproval && {
          status: "PENDING" as const,
          approverId: null,
          approvedAt: null,
          paidAt: null,
          rejectionReason: null,
        }),
        updatedAt: new Date(),
      }).where(and(eq(expenses.id, expenseId), eq(expenses.orgId, session.orgId)));

      return ok({ success: true });
    }

    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can update expense status.", 403);
    }

    const parsedStatus = updateStatusSchema.safeParse(rawBody);
    if (!parsedStatus.success) {
      return err("status must be APPROVED, REJECTED, or PAID.", 400);
    }
    const body = parsedStatus.data;

    await db.transaction(async (tx) => {
      const [expense] = await tx
        .select()
        .from(expenses)
        .where(
          and(
            eq(expenses.id, expenseId),
            eq(expenses.orgId, session.orgId)
          )
        )
        .for("update");

      if (!expense) throw new Error("Expense not found");
      if (expense.status !== "PENDING") throw new Error("Expense has already been processed");

      await tx
        .update(expenses)
        .set({
          status: body.status,
          approverId: session.user.id,
          rejectionReason: body.rejectionReason ?? null,
          ...(body.status === "APPROVED" && { approvedAt: new Date() }),
          ...(body.status === "PAID" && { paidAt: new Date() }),
        })
        .where(eq(expenses.id, expenseId));
    });

    const auditAction = body.status === "APPROVED" ? "expense.approved" : body.status === "PAID" ? "expense.paid" : "expense.rejected";
    try {
      await createAuditLog({
        action: auditAction,
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(expenseId),
        targetType: "expense",
        metadata: { status: body.status, rejectionReason: body.rejectionReason },
      });
    } catch {  }

    try {
      const expenseRow = await db.query.expenses.findFirst({
        where: eq(expenses.id, expenseId),
        columns: { userId: true, category: true, amount: true },
      });

      if (expenseRow?.userId) {
        const employee = await db.query.users.findFirst({
          where: eq(users.id, expenseRow.userId),
          columns: { email: true, name: true },
        });

        if (employee?.email) {
          const approverName = session.user.name ?? "Admin";
          const amount = expenseRow.amount ?? "0";
          const category = expenseRow.category ?? "Expense";

          if (body.status === "APPROVED") 
            await sendExpenseApprovedEmail(employee.email, employee.name ?? "Employee", category, amount, approverName);
           else if (body.status === "REJECTED") 
            await sendExpenseRejectedEmail(employee.email, employee.name ?? "Employee", category, amount, approverName, body.rejectionReason ?? "No reason provided");
          else if (body.status === "PAID") 
            await sendExpensePaidEmail(employee.email, employee.name ?? "Employee", category, amount);
          
        }
      }
    } catch {  }

    return ok({ success: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  return withAuth(async (session) => {
    const { expenseId: id } = await params;
    const expenseId = Number(id);
    if (isNaN(expenseId)) return err("Invalid expense ID.", 400);

    const expense = await db.query.expenses.findFirst({
      where: and(eq(expenses.id, expenseId), eq(expenses.orgId, session.orgId)),
      columns: { id: true, userId: true, status: true },
    });

    if (!expense) return err("Expense not found.", 404);

    const isOwner = expense.userId === session.user.id;
    const isAdmin = isAdminOrOwner(session.user.role);

    if (!isOwner && !isAdmin) return err("Not authorized to delete this expense.", 403);
    if (expense.status === "PAID") return err("Paid expenses cannot be deleted.", 400);

    await db.delete(expenses).where(and(eq(expenses.id, expenseId), eq(expenses.orgId, session.orgId)));

    void createAuditLog({
      action: "expense.deleted",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(expenseId),
      targetType: "expense",
    }).catch(() => {});

    return ok({ success: true });
  });
}
