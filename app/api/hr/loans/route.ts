import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { salaryLoans } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { notifyByRoles } from "@/server/actions/create-notification";
import { ROLES } from "@/lib/constants/roles";
import type { NextRequest } from "next/server";
import { CURRENCY_SYMBOL, DEFAULT_LOCALE } from "@/lib/constants/locale";

const MAX_LOAN_AMOUNT = 10_000_000;

const createSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be positive")
    .max(MAX_LOAN_AMOUNT, `Amount cannot exceed ${CURRENCY_SYMBOL}${MAX_LOAN_AMOUNT.toLocaleString(DEFAULT_LOCALE)}`),
  reason: z.string().min(1).max(500),
  totalEmis: z.number().int().min(1).max(24).optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);
    const conditions = [eq(salaryLoans.orgId, session.orgId)];
    if (!isAdmin) conditions.push(eq(salaryLoans.userId, session.user.id));

    const data = await db.query.salaryLoans.findMany({
      where: and(...conditions),
      with: { user: { columns: { id: true, name: true, email: true } } },
      orderBy: [desc(salaryLoans.createdAt)],
    });
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = createSchema.parse(await req.json());
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

    void notifyByRoles(session.orgId, [ROLES.CEO, ROLES.HR], {
      type: "INFO",
      title: "Salary Loan Request",
      message: `${session.user.name ?? "An employee"} requested a salary loan of ${CURRENCY_SYMBOL}${body.amount.toLocaleString(DEFAULT_LOCALE)}.`,
      link: "/hr/loans",
      metadata: { loanId: loan.id },
      excludeUserId: session.user.id,
    }).catch(() => {});

    return ok(loan, 201);
  });
}
