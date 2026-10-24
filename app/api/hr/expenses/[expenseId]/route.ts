import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { expenses, reimbursements, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { canDecideRequest } from "@/lib/auth/separation-of-duties";
import { zodErrorMessage } from "@/lib/api/zod-message";
import { expenseStatusUpdateSchema, expenseTransitionError } from "@/lib/hr/expense-status";
import { NextResponse, type NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";
import { sendExpenseApprovedEmail, sendExpenseRejectedEmail, sendExpensePaidEmail } from "@/lib/email";
import { updateExpenseDetailsSchema } from "@/lib/validations/expense";
import { formatIST } from "@/lib/date-utils";

/**
 * MIYO-0248: when an approved claim is paid out. Stated in the approval mail
 * so nobody has to ask; a deployment that pays on another cycle sets this.
 */
const REIMBURSEMENT_CYCLE =
  process.env.NEXT_PUBLIC_REIMBURSEMENT_CYCLE || "with the next monthly payroll";

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

    const parsedStatus = expenseStatusUpdateSchema.safeParse(rawBody);
    if (!parsedStatus.success) {
      return NextResponse.json(
        { error: zodErrorMessage(parsedStatus.error), fieldErrors: parsedStatus.error.flatten().fieldErrors },
        { status: 400 },
      ) as NextResponse<never>;
    }
    const body = parsedStatus.data;

    const owner = await db
      .select({ id: users.id, role: users.role, filedBy: expenses.filedBy })
      .from(expenses)
      .innerJoin(users, eq(users.id, expenses.userId))
      .where(and(eq(expenses.id, expenseId), eq(expenses.orgId, session.orgId)))
      .limit(1);
    if (!owner[0]) return err("Expense not found.", 404);
    const duty = canDecideRequest(session.user, owner[0]);
    if (!duty.allowed) return err(duty.message, 403);
    // A claim filed on someone's behalf needs a second person (R2-CRUD-06).
    if (body.status === "APPROVED" && owner[0].filedBy === session.user.id) {
      return err("You filed this claim, so another approver must approve it.", 403);
    }

    // R3-HR-01: a wrong-state request used to throw inside the transaction and
    // surface as a 500; it is a 409 with a message now.
    const conflict = await db.transaction(async (tx) => {
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

      if (!expense) return { status: 404, message: "Expense not found." };
      const transitionError = expenseTransitionError(expense.status, body.status);
      if (transitionError) return { status: 409, message: transitionError };

      // Paying out keeps the approver and reason the claim was decided with.
      await tx
        .update(expenses)
        .set({
          status: body.status,
          ...(body.status === "PAID"
            ? { paidAt: new Date() }
            : { approverId: session.user.id, rejectionReason: body.rejectionReason ?? null }),
          ...(body.status === "APPROVED" && { approvedAt: new Date() }),
          updatedAt: new Date(),
        })
        .where(eq(expenses.id, expenseId));

      // The employee's Reimbursements page reads this row, so it follows the
      // payout; a claim approved before A41 has no row yet and gets one.
      if (body.status === "PAID") {
        const paidAt = new Date();
        await tx
          .insert(reimbursements)
          .values({
            orgId: session.orgId,
            userId: expense.userId,
            expenseId,
            category: expense.category ?? "Expense",
            amount: expense.amount ?? "0",
            description: expense.description,
            receiptUrl: expense.receiptUrl,
            status: "PAID",
            approvedBy: expense.approverId,
            approvedAt: expense.approvedAt,
            paidAt,
          })
          .onConflictDoUpdate({
            target: reimbursements.expenseId,
            set: { status: "PAID", paidAt, updatedAt: paidAt },
          });
      }

      // An approved claim is money owed, so it shows up in Reimbursements
      // ready to pay (A41). The unique expense_id makes this idempotent.
      if (body.status === "APPROVED") {
        await tx
          .insert(reimbursements)
          .values({
            orgId: session.orgId,
            userId: expense.userId,
            expenseId,
            category: expense.category ?? "Expense",
            amount: expense.amount ?? "0",
            description: expense.description,
            receiptUrl: expense.receiptUrl,
            status: "APPROVED",
            approvedBy: session.user.id,
            approvedAt: new Date(),
          })
          .onConflictDoNothing();
      }
      return null;
    });
    if (conflict) return err(conflict.message, conflict.status);

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
        columns: { userId: true, category: true, amount: true, transactionRef: true },
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

          if (body.status === "APPROVED") {
            await sendExpenseApprovedEmail(
              employee.email,
              category,
              amount,
              approverName,
              REIMBURSEMENT_CYCLE,
            );
          } else if (body.status === "REJECTED") {
            await sendExpenseRejectedEmail(
              employee.email,
              category,
              amount,
              approverName,
              body.rejectionReason ?? "",
            );
          } else if (body.status === "PAID") {
            await sendExpensePaidEmail(
              employee.email,
              amount,
              `${formatIST(new Date())} IST`,
              expenseRow.transactionRef,
            );
          }
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
    // Withdrawing is for a claim nobody has signed off yet (R2-CRUD-06); an
    // approved one already sits in Reimbursements.
    if (!isAdmin && expense.status === "APPROVED") {
      return err("An approved claim cannot be withdrawn. Ask HR to reject it instead.", 400);
    }

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
