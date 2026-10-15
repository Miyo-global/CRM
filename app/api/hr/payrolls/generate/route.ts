import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { payrolls, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { calendarDaysInMonth } from "@/lib/hr/payroll-calculations";
import { loadPayrollInputs } from "@/lib/payroll/load-inputs";
import { computePayroll } from "@/lib/payroll/compute";
import { payrollRowValues } from "@/lib/payroll/to-row";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit-log";
import { getErrorMessage } from "@/lib/get-error-message";

const generateSinglePayrollSchema = z
  .object({
    userId: z.string().min(1),
    month: z.string().regex(/^\d{4}-\d{2}$/),
    bonus: z.number().min(0).default(0),
    otherDeductions: z.number().min(0).default(0),
    /** Optional custom pay period within the same calendar month (YYYY-MM-DD). */
    periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine((b) => (b.periodStart ? !!b.periodEnd : true) && (b.periodEnd ? !!b.periodStart : true), {
    message: "Both periodStart and periodEnd are required for a custom period.",
  })
  .refine(
    (b) =>
      !b.periodStart ||
      !b.periodEnd ||
      (b.periodStart.slice(0, 7) === b.month &&
        b.periodEnd.slice(0, 7) === b.month &&
        b.periodEnd >= b.periodStart),
    {
      message:
        "Custom period must fall within the selected month and end on or after its start.",
    },
  );

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, generateSinglePayrollSchema);

    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
      columns: { id: true },
    });
    if (!membership) {
      return err("Employee not found in this organization.", 404);
    }

    const monthLastDay = calendarDaysInMonth(body.month);
    const monthEndStr = `${body.month}-${String(monthLastDay).padStart(2, "0")}`;

    const existingPayroll = await db.query.payrolls.findFirst({
      where: and(
        eq(payrolls.orgId, session.orgId),
        eq(payrolls.userId, body.userId),
        eq(payrolls.month, body.month)
      ),
      columns: { id: true, status: true },
    });
    if (existingPayroll) {
      return err(
        `Payroll for ${body.month} already exists (id: ${existingPayroll.id}, status: ${existingPayroll.status}). Delete the existing DRAFT first.`,
        409
      );
    }

    const inputs = await loadPayrollInputs({
      orgId: session.orgId,
      userIds: [body.userId],
      month: body.month,
      overrides: {
        [body.userId]: {
          bonus: body.bonus || 0,
          otherDeductions: body.otherDeductions || 0,
        },
      },
      evaluateThrough:
        body.periodEnd && body.periodEnd < monthEndStr ? body.periodEnd : undefined,
    });
    const input = inputs.get(body.userId);
    if (!input) {
      return err("Could not load payroll inputs for this employee.", 400);
    }
    if (input.monthlySalary <= 0) {
      return err(
        "No salary applies to this month. Add a salary structure effective on or before this month, or set the monthly salary on the employee.",
        400,
      );
    }

    const run = computePayroll(input);
    if (run.notEmployed) {
      return err(
        `This employee was not on the payroll in ${body.month} (joining date is after the month end).`,
        400,
      );
    }

    let payroll;
    try {
      [payroll] = await db
        .insert(payrolls)
        .values(
          payrollRowValues(run, {
            orgId: session.orgId,
            userId: body.userId,
            generatedBy: session.user.id,
          }),
        )
        .returning();
    } catch (error) {
      const message = getErrorMessage(error).toLowerCase();
      if (message.includes("uniq_payroll_org_user_month") || message.includes("duplicate key")) {
        return err("Payroll already exists for this employee and month.", 409);
      }
      throw error;
    }

    void createAuditLog({
      action: "hr.payroll_generated",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(payroll.id),
      targetType: "payroll",
      metadata: { employeeId: body.userId, month: body.month, netSalary: run.netSalary },
    }).catch(() => {});

    return ok({ success: true, payrollId: payroll.id });
  });
}
