import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { payrolls } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";
import { sendPayslipEmailForPayroll } from "@/lib/hr/send-payslip-email";
import { logger } from "@/lib/logger";

export async function POST(
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
    if (existing.status !== "PAID") {
      return err("Payslip email can only be sent for PAID payrolls.", 400);
    }

    const { emailSent, emailError } = await sendPayslipEmailForPayroll(session.orgId, existing);

    try {
      await createAuditLog({
        action: "hr.payroll_paid",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(payrollId),
        targetType: "payroll",
        metadata: {
          employeeId: existing.userId,
          month: existing.month,
          action: "resend_email",
          emailSent,
          emailError: emailError ?? null,
        },
      });
    } catch (error) {
      logger.error("Failed to write payslip resend audit log", { payrollId, error });
    }

    return ok({
      success: true,
      emailSent,
      ...(emailError ? { emailError } : {}),
    });
  });
}
