import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { salaryLoans } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { createLoanSchema } from "@/lib/validations/loan";
import { notifyByRoles } from "@/server/actions/create-notification";
import { ROLES } from "@/lib/constants/roles";
import type { NextRequest } from "next/server";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";
import { rejectDuplicateSubmit } from "@/lib/api/submit-guard";
import { afterResponse } from "@/lib/after-response";

export async function GET() {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);
    const conditions = [eq(salaryLoans.orgId, session.orgId)];
    if (!isAdmin) conditions.push(eq(salaryLoans.userId, session.user.id));

    const data = await db.query.salaryLoans.findMany({
      where: and(...conditions),
      with: { user: { columns: { id: true, name: true, email: true, role: true } } },
      orderBy: [desc(salaryLoans.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = createLoanSchema.parse(await req.json());
    const dup = await rejectDuplicateSubmit("loan", session.user.id, body);
    if (dup) return dup;

    // The submit guard only covers a 10 s window; QA found 20 identical pending loans (R2-HR-06).
    const [pending] = await db
      .select({ id: salaryLoans.id })
      .from(salaryLoans)
      .where(and(
        eq(salaryLoans.orgId, session.orgId),
        eq(salaryLoans.userId, session.user.id),
        eq(salaryLoans.status, "PENDING"),
        sql`${salaryLoans.amount} = ${body.amount}`,
      ))
      .limit(1);
    if (pending) {
      return err(
        `You already have a pending loan request for ${CURRENCY_SYMBOL}${body.amount.toLocaleString(DEFAULT_LOCALE)}. Wait for a decision on it first.`,
        409,
      );
    }
    const emiAmount = body.totalEmis ? Math.ceil((body.amount / body.totalEmis) * 100) / 100 : body.amount;

    const [loan] = await db.insert(salaryLoans).values({
      orgId: session.orgId,
      userId: session.user.id,
      amount: body.amount.toString(),
      reason: body.reason,
      emiAmount: emiAmount.toFixed(2),
      totalEmis: body.totalEmis ?? 1,
      paidEmis: 0,
      status: "PENDING",
    }).returning();

    afterResponse("hr/loans", () => notifyByRoles(session.orgId, [ROLES.CEO, ROLES.HR], {
      type: "INFO",
      title: "Salary Loan Request",
      message: `${session.user.name ?? "An employee"} requested a salary loan of ${CURRENCY_SYMBOL}${body.amount.toLocaleString(DEFAULT_LOCALE)}.`,
      link: "/hr/loans",
      metadata: { loanId: loan.id },
      excludeUserId: session.user.id,
    }));

    return ok(loan, 201);
  });
}
