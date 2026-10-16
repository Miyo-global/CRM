import { withAdmin, ok, parseBody } from "@/lib/api/helpers";
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
