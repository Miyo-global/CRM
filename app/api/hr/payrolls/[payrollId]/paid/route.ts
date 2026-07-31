import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { payrolls, salaryLoans } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";
import { sendPayslipEmailForPayroll } from "@/lib/hr/send-payslip-email";
import { logger } from "@/lib/logger";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ payrollId: string }> }
) {
  return withAdmin(async (session) => {
    const { payrollId: id } = await params;
    const payrollId = Number(id);
    if (!payrollId) return err("Invalid payroll ID.", 400);

    const existing = await db.query.payrolls.findFirst({
      where: and(eq(payrolls.id, payrollId), eq(payrolls.orgId, session.orgId)),
    });

    if (!existing) return err("Payroll not found.", 404);
    if (existing.status === "PAID") {
      return err("Payroll is already marked as paid.", 400);
    }
    if (existing.status !== "APPROVED") {
      return err("Payroll must be approved before marking as paid.", 400);
    }

    const recoveryAmount = parseFloat(existing.advanceRecoveryAmount ?? "0");

    await db.transaction(async (tx) => {
      await tx
        .update(payrolls)
        .set({
          status: "PAID",
          paidBy: session.user.id,
          paidAt: new Date(),
        })
        .where(and(eq(payrolls.id, payrollId), eq(payrolls.orgId, session.orgId)));

      if (recoveryAmount > 0 && existing.userId) {
        const activeLoan = await tx.query.salaryLoans.findFirst({
          where: and(
            eq(salaryLoans.orgId, session.orgId),
            eq(salaryLoans.userId, existing.userId),
            eq(salaryLoans.status, "ACTIVE")
          ),
          columns: { id: true, paidEmis: true, totalEmis: true },
          orderBy: (t, { asc }) => [asc(t.createdAt)],
        });
        if (
          activeLoan &&
          (activeLoan.totalEmis ?? 0) > 0 &&
          (activeLoan.paidEmis ?? 0) < (activeLoan.totalEmis ?? 0)
        ) {
          const nextPaidEmis = (activeLoan.paidEmis ?? 0) + 1;
          await tx
            .update(salaryLoans)
            .set({
              paidEmis: sql`${salaryLoans.paidEmis} + 1`,
              status: nextPaidEmis >= (activeLoan.totalEmis ?? 0) ? "REPAID" : "ACTIVE",
              updatedAt: new Date(),
            })
            .where(and(eq(salaryLoans.id, activeLoan.id), eq(salaryLoans.orgId, session.orgId)));
        }
      }
    });

    try {
      await createAuditLog({
        action: "hr.payroll_paid",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(payrollId),
        targetType: "payroll",
        metadata: { employeeId: existing.userId, month: existing.month, netSalary: existing.netSalary },
      });
    } catch (error) {
      logger.error("Failed to write payroll paid audit log", { payrollId, error });
    }

    const { emailSent, emailError } = await sendPayslipEmailForPayroll(session.orgId, existing);

    return ok({
      success: true,
      emailSent,
      ...(emailError ? { emailError } : {}),
    });
  });
}
