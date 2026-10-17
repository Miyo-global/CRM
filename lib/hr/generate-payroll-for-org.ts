import "server-only";

import { db } from "@/lib/db";
import { payrolls, organizationMembers } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { loadPayrollInputs } from "@/lib/payroll/load-inputs";
import { computePayroll } from "@/lib/payroll/compute";
import { payrollRowValues } from "@/lib/payroll/to-row";
import { notifyByRoles } from "@/server/actions/create-notification";
import { ROLES } from "@/lib/constants/roles";

export interface GeneratePayrollForOrgOptions {
  orgId: string;
  /** Calendar month key, YYYY-MM. Payroll rows are keyed by this month. */
  month: string;
  /** User who triggered the generation (manual admin or the schedule creator for automated runs). */
  generatedBy: string;
  /** Per-employee bonus / other-deduction overrides (manual flows only). */
  overrides?: Record<string, { otherDeductions?: number; bonus?: number }>;
  /**
   * Optional custom-period end (YYYY-MM-DD) within the month. Caps how far the
   * attendance window is evaluated so a partial period is not docked as LOP for
   * the days after it. Defaults to today (IST) inside the attendance helper.
   */
  evaluateThrough?: string;
}

export interface GeneratePayrollForOrgResult {
  generated: number;
  payrollIds: number[];
}

/**
 * All-employee payroll generation for a single org + month.
 *
 * Used by the manual bulk-generate API route and by the automated payroll
 * schedule (Inngest). Inputs come from `loadPayrollInputs` and the money from
 * `computePayroll` — the same loader and the same pure function the preview and
 * the per-employee generate route use (A3).
 *
 * Idempotent at the row level: rows that already exist for (orgId, userId,
 * month) are skipped via ON CONFLICT DO NOTHING.
 */
export async function generatePayrollForOrg(
  opts: GeneratePayrollForOrgOptions,
): Promise<GeneratePayrollForOrgResult> {
  const { orgId, month, generatedBy } = opts;

  const memberships = await db.query.organizationMembers.findMany({
    where: eq(organizationMembers.orgId, orgId),
  });
  const memberUserIds = memberships.map((m) => m.userId).filter(Boolean) as string[];
  if (memberUserIds.length === 0) return { generated: 0, payrollIds: [] };

  const existingPayrolls = await db.query.payrolls.findMany({
    where: and(
      inArray(payrolls.userId, memberUserIds),
      eq(payrolls.month, month),
      eq(payrolls.orgId, orgId),
    ),
    columns: { userId: true },
  });
  const alreadyRun = new Set(existingPayrolls.map((p) => p.userId));
  const pendingUserIds = memberUserIds.filter((id) => !alreadyRun.has(id));
  if (pendingUserIds.length === 0) return { generated: 0, payrollIds: [] };

  const inputs = await loadPayrollInputs({
    orgId,
    userIds: pendingUserIds,
    month,
    overrides: opts.overrides,
    evaluateThrough: opts.evaluateThrough,
  });

  const newPayrolls = [];
  const emiSkippedFor: string[] = [];
  for (const userId of pendingUserIds) {
    const input = inputs.get(userId);
    if (!input || input.monthlySalary <= 0) continue;
    const run = computePayroll(input);
    // Not employed in this month (joined later, or already left): no payslip.
    if (run.notEmployed) continue;
    if (run.advanceRecoverySkipped) emiSkippedFor.push(userId);
    newPayrolls.push(payrollRowValues(run, { orgId, userId, generatedBy }));
  }

  // MIYO-0125: an EMI that net pay could not cover used to vanish quietly.
  if (emiSkippedFor.length > 0) {
    void notifyByRoles(orgId, [ROLES.CEO, ROLES.HR], {
      type: "WARNING",
      title: "Loan EMI not recovered",
      message: `${emiSkippedFor.length} payslip${emiSkippedFor.length === 1 ? "" : "s"} for ${month} could not cover the loan EMI, so it was not deducted. The loan schedule is unchanged.`,
      link: "/hr/loans",
    });
  }

  if (newPayrolls.length === 0) return { generated: 0, payrollIds: [] };

  const inserted = await db
    .insert(payrolls)
    .values(newPayrolls)
    .onConflictDoNothing({
      target: [payrolls.orgId, payrolls.userId, payrolls.month],
    })
    .returning({ id: payrolls.id });

  return { generated: inserted.length, payrollIds: inserted.map((r) => r.id) };
}
