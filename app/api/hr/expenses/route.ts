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

    const duplicateCheck = await db.query.expenses.findFirst({
      where: and(
        eq(expenses.orgId, session.orgId),
        eq(expenses.userId, session.user.id),
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

    const [expense] = await db
      .insert(expenses)
      .values({
        orgId: session.orgId,
        userId: session.user.id,
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
        status: isAdminRole ? "APPROVED" : "PENDING",
        approverId: isAdminRole ? session.user.id : null,
        approvedAt: isAdminRole ? new Date() : null,
      })
      .returning();

    try {
      await createAuditLog({
        action: "expense.created",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(expense.id),
        targetType: "expense",
        metadata: { category: body.category, amount: body.amount },
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
              sendExpenseSubmittedEmail(
                r.email!,
                r.name ?? "HR",
                session.user.name ?? "Employee",
                body.category,
                body.amount.toString(),
                body.description ?? ""
              )
            )
        );
      }
    } catch {  }

    return ok(expense);
  });
}
