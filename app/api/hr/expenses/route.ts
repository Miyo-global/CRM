import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getExpenses } from "@/server/queries/hr";
import { db } from "@/lib/db";
import { expenses, users, organizationMembers } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { formatDateOnly } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";
import { sendExpenseSubmittedEmail } from "@/lib/email";
import { createExpenseBodySchema } from "@/lib/validations/expense";
import { resolveLeaveApprover } from "@/lib/hr/leave-approvals-server";

const createExpenseSchema = createExpenseBodySchema;

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const isAdmin = isAdminOrOwner(session.user.role);
    const filterUserId = searchParams.get("userId") ?? undefined;
    const status = searchParams.get("status") as
      | "PENDING"
      | "APPROVED"
      | "REJECTED"
      | "PAID"
      | null;
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;

    const data = await getExpenses(session.orgId, session.user.id, isAdmin, {
      filterUserId,
      status: status ?? undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      startDate,
      endDate,
    });

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await parseBody(req, createExpenseSchema);

    if (!body.category || body.amount === undefined || !body.expenseDate) {
      return err("category, amount, and expenseDate are required.", 400);
    }

    const isAdminRole = isAdminOrOwner(session.user.role);

    // R2-CRUD-06: HR and Admins may file a claim for another employee; it is
    // then that employee's claim and routes to their approver.
    const claimantId = body.userId ?? session.user.id;
    const onBehalf = claimantId !== session.user.id;
    if (onBehalf) {
      if (!isAdminRole) return err("Only HR or an Admin can file an expense for someone else.", 403);
      const member = await db.query.organizationMembers.findFirst({
        where: and(eq(organizationMembers.orgId, session.orgId), eq(organizationMembers.userId, claimantId)),
        columns: { userId: true },
      });
      if (!member) return err("Employee not found.", 404);
      const claimant = await db.query.users.findFirst({
        where: eq(users.id, claimantId),
        columns: { isActive: true },
      });
      if (claimant?.isActive === false) return err("This employee is no longer active.", 400);
    }

    const duplicateCheck = await db.query.expenses.findFirst({
      where: and(
        eq(expenses.orgId, session.orgId),
        eq(expenses.userId, claimantId),
        eq(expenses.amount, body.amount.toString()),
        eq(expenses.expenseDate, formatDateOnly(body.expenseDate)),
        ...(body.merchant ? [eq(expenses.merchant, body.merchant)] : []),
      ),
      columns: { id: true },
    });
    if (duplicateCheck) {
      return err(
        "Duplicate expense detected. An expense with the same amount, date, and merchant already exists.",
        409
      );
    }

    const requester = await db.query.users.findFirst({
      where: eq(users.id, claimantId),
      columns: { id: true, name: true, role: true, reportingTo: true },
    });
    const expenseApprover = await resolveLeaveApprover(session.orgId, {
      id: claimantId,
      role: requester?.role ?? (onBehalf ? null : session.user.role),
      reportingTo: requester?.reportingTo ?? null,
    });
    // Whoever filed it does not then approve it: a claim filed on someone's
    // behalf is left for another approver when the filer would get it.
    const approverId = onBehalf && expenseApprover.approverId === session.user.id ? null : expenseApprover.approverId;
    const autoApprove = expenseApprover.autoApprove && !onBehalf;

    const [expense] = await db
      .insert(expenses)
      .values({
        orgId: session.orgId,
        userId: claimantId,
        filedBy: onBehalf ? session.user.id : null,
        category: body.category,
        categoryId: body.categoryId,
        amount: body.amount.toString(),
        description: body.description,
        receiptUrl: body.receiptUrl,
        receiptFileName: body.receiptFileName,
        merchant: body.merchant,
        paymentMethod: body.paymentMethod,
        projectId: body.projectId,
        expenseDate: formatDateOnly(body.expenseDate),
        // Nobody approves their own claim, admins included: route it up the
        // same chain leave uses (A41).
        status: autoApprove ? "APPROVED" : "PENDING",
        approverId,
        approvedAt: autoApprove ? new Date() : null,
      })
      .returning();

    try {
      await createAuditLog({
        action: "expense.created",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(expense.id),
        targetType: "expense",
        metadata: { category: body.category, amount: body.amount, ...(onBehalf && { onBehalfOf: claimantId }) },
      });
    } catch {  }

    try {
      if (!isAdminRole) {
        const recipients = await db
          .select({ email: users.email, name: users.name })
          .from(organizationMembers)
          .innerJoin(users, eq(users.id, organizationMembers.userId))
          .where(
            and(
              eq(organizationMembers.orgId, session.orgId),
              inArray(organizationMembers.role, ["HR", "CEO", "ADMIN"])
            )
          );

        await Promise.all(
          recipients
            .filter((r) => r.email)
            .map((r) =>
              sendExpenseSubmittedEmail(r.email!, {
                employeeName: requester?.name ?? session.user.name ?? "Employee",
                category: body.category,
                amount: body.amount,
                description: body.description,
                expenseDate: formatDateOnly(body.expenseDate),
                expenseId: expense.id,
                hasReceipt: Boolean(body.receiptUrl),
              })
            )
        );
      }
    } catch {  }

    return ok(expense);
  });
}
