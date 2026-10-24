import { withAuth, withAdmin, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { fnfSettlements, resignations, terminations, users } from "@/lib/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { fnfTotals } from "@/lib/hr/fnf-figures";
import { z } from "zod";
import type { NextRequest } from "next/server";

const amount = z.number().nonnegative("Amounts cannot be negative").optional();

const createSchema = z.object({
  userId: z.string().min(1),
  resignationId: z.number().int().positive().optional(),
  basicDues: amount,
  leaveEncashment: amount,
  bonusDue: amount,
  deductions: amount,
  loanRecovery: amount,
  notes: z.string().max(2000).optional(),
});

export async function GET() {
  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);

    // R3-SA-04: the list showed "Employee" and dashes; join the person and
    // derive the last working day from the resignation or termination.
    const rows = await db
      .select({
        fnf: fnfSettlements,
        employeeName: users.name,
        resignationLwd: resignations.lastWorkingDate,
      })
      .from(fnfSettlements)
      .leftJoin(users, eq(users.id, fnfSettlements.userId))
      .leftJoin(resignations, eq(resignations.id, fnfSettlements.resignationId))
      .where(
        isAdmin
          ? eq(fnfSettlements.orgId, session.orgId)
          : and(eq(fnfSettlements.orgId, session.orgId), eq(fnfSettlements.userId, session.user.id))
      )
      .orderBy(desc(fnfSettlements.createdAt));

    const userIds = [...new Set(rows.map((r) => r.fnf.userId))];
    const terms = userIds.length
      ? await db
          .select({ userId: terminations.userId, effectiveDate: terminations.effectiveDate })
          .from(terminations)
          .where(
            and(
              eq(terminations.orgId, session.orgId),
              inArray(terminations.userId, userIds),
              inArray(terminations.status, ["SENT", "COMPLETED"]),
            ),
          )
          .orderBy(desc(terminations.updatedAt))
      : [];
    const terminationLwd = new Map<string, string>();
    for (const t of terms) if (!terminationLwd.has(t.userId)) terminationLwd.set(t.userId, String(t.effectiveDate));

    return ok(
      rows.map(({ fnf, employeeName, resignationLwd }) => {
        const totals = fnfTotals(fnf);
        return {
          ...fnf,
          employeeName,
          lastWorkingDate: resignationLwd ?? terminationLwd.get(fnf.userId) ?? null,
          grossPay: totals.gross.toFixed(2),
          totalDeductions: totals.deductions.toFixed(2),
          netPay: totals.net.toFixed(2),
        };
      }),
    );
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = createSchema.parse(await req.json());

    const basicDues = body.basicDues ?? 0;
    const leaveEncashment = body.leaveEncashment ?? 0;
    const bonusDue = body.bonusDue ?? 0;
    const deductions = body.deductions ?? 0;
    const loanRecovery = body.loanRecovery ?? 0;
    const netPayable = basicDues + leaveEncashment + bonusDue - deductions - loanRecovery;

    const [record] = await db
      .insert(fnfSettlements)
      .values({
        orgId: session.orgId,
        userId: body.userId,
        resignationId: body.resignationId ?? null,
        basicDues: basicDues.toString(),
        leaveEncashment: leaveEncashment.toString(),
        bonusDue: bonusDue.toString(),
        deductions: deductions.toString(),
        loanRecovery: loanRecovery.toString(),
        netPayable: netPayable.toString(),
        notes: body.notes ?? null,
        status: "DRAFT",
      })
      .returning();

    return ok(record, 201);
  });
}
