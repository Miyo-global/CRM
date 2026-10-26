import { withAdmin, ok, parseBody, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { payrolls } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { loadPayrollInputs } from "@/lib/payroll/load-inputs";
import { computePayroll } from "@/lib/payroll/compute";
import { payrollRowValues } from "@/lib/payroll/to-row";
import { createAuditLog } from "@/lib/audit-log";
import type { NextRequest } from "next/server";
import { z } from "zod";

const recomputeSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  /** Omit to recalculate every DRAFT payroll of the month. */
  payrollIds: z.array(z.number().int().positive()).max(500).optional(),
});

/**
 * Re-run the payroll rules for DRAFT rows (MIYO-0017). Drafts are frozen at
 * generation time, so rule fixes never reached them. Bonus and other
 * deductions entered at generation are kept. APPROVED/PAID rows are never
 * touched: they are filtered out on read and again in the UPDATE.
 */
export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, recomputeSchema);

    const drafts = await db.query.payrolls.findMany({
      where: and(
        eq(payrolls.orgId, session.orgId),
        eq(payrolls.month, body.month),
        eq(payrolls.status, "DRAFT"),
        body.payrollIds ? inArray(payrolls.id, body.payrollIds) : undefined,
      ),
      columns: { id: true, userId: true, netSalary: true, allowances: true, otherDeductions: true, generatedBy: true },
    });
    if (drafts.length === 0) return ok({ recalculated: 0, skipped: 0 });

    const overrides = Object.fromEntries(
      drafts.map((d) => [
        d.userId,
        { bonus: parseFloat(d.allowances ?? "0") || 0, otherDeductions: parseFloat(d.otherDeductions ?? "0") || 0 },
      ]),
    );
    const inputs = await loadPayrollInputs({
      orgId: session.orgId,
      userIds: drafts.map((d) => d.userId),
      month: body.month,
      overrides,
    });

    let recalculated = 0;
    let skipped = 0;
    for (const draft of drafts) {
      const input = inputs.get(draft.userId);
      if (!input || input.monthlySalary <= 0) {
        skipped++;
        continue;
      }
      const run = computePayroll(input);
      // Deductions above gross would save a misleading ₹0 net; leave the draft as is.
      if (run.deductionsExceedGross) {
        skipped++;
        continue;
      }
      const values = payrollRowValues(run, {
        orgId: session.orgId,
        userId: draft.userId,
        generatedBy: draft.generatedBy ?? session.user.id,
      });
      const [updated] = await db
        .update(payrolls)
        .set(values)
        .where(and(eq(payrolls.id, draft.id), eq(payrolls.orgId, session.orgId), eq(payrolls.status, "DRAFT")))
        .returning({ id: payrolls.id });
      if (!updated) {
        skipped++;
        continue;
      }
      recalculated++;
      void createAuditLog({
        action: "hr.payroll_recalculated",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(draft.id),
        targetType: "payroll",
        metadata: { employeeId: draft.userId, month: body.month, netBefore: draft.netSalary, netAfter: values.netSalary },
      }).catch(() => {});
    }

    return ok({ recalculated, skipped });
  });
}

const staleQuerySchema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) });

/**
 * How many DRAFT rows of the month no longer match a fresh calculation
 * (QA-0022). Drafts are frozen at generation time, so a rule change leaves
 * stale values behind silently; the payroll page uses this to offer a
 * recompute instead of waiting for someone to notice.
 */
export async function GET(req: NextRequest) {
  return withAdmin(async (session) => {
    const { month } = parseQuery(req, staleQuerySchema);

    const drafts = await db.query.payrolls.findMany({
      where: and(
        eq(payrolls.orgId, session.orgId),
        eq(payrolls.month, month),
        eq(payrolls.status, "DRAFT"),
      ),
      columns: {
        id: true,
        userId: true,
        netSalary: true,
        ptAmount: true,
        lopDays: true,
        allowances: true,
        otherDeductions: true,
      },
    });
    if (drafts.length === 0) return ok({ month, draftCount: 0, staleIds: [] });

    const overrides = Object.fromEntries(
      drafts.map((d) => [
        d.userId,
        { bonus: parseFloat(d.allowances ?? "0") || 0, otherDeductions: parseFloat(d.otherDeductions ?? "0") || 0 },
      ]),
    );
    const inputs = await loadPayrollInputs({
      orgId: session.orgId,
      userIds: drafts.map((d) => d.userId),
      month,
      overrides,
    });

    const sameMoney = (a: string | null, b: number | string | null) =>
      Math.abs((parseFloat(String(a ?? "0")) || 0) - (parseFloat(String(b ?? "0")) || 0)) < 0.01;

    const staleIds: number[] = [];
    for (const draft of drafts) {
      const input = inputs.get(draft.userId);
      if (!input || input.monthlySalary <= 0) continue;
      const fresh = computePayroll(input);
      const values = payrollRowValues(fresh, {
        orgId: session.orgId,
        userId: draft.userId,
        generatedBy: session.user.id,
      }) as Record<string, unknown>;
      const stale =
        !sameMoney(draft.netSalary, values.netSalary as string) ||
        !sameMoney(draft.ptAmount, values.ptAmount as string) ||
        !sameMoney(draft.lopDays, values.lopDays as string);
      if (stale) staleIds.push(draft.id);
    }

    return ok({ month, draftCount: drafts.length, staleIds });
  });
}
