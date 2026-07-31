import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { payrolls, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";
import { sendPayrollApprovedEmail } from "@/lib/email";
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

    if (session.user.role !== "CEO") {
      return err(
        "Only the CEO can approve payrolls. This payroll will stay in DRAFT until the CEO reviews and approves it.",
        403
      );
    }

    if (existing.userId === session.user.id) {
      return err("The CEO cannot approve their own payroll. Please contact a board-level admin to process this payroll.", 403);
    }

    if (existing.status === "PAID")
      return err("This payroll is already paid, so it can't be re-approved. No further action is needed.", 400);
    if (existing.status === "APPROVED")
      return err("This payroll is already approved. The next step is to mark it as paid.", 400);

    await db
      .update(payrolls)
      .set({
        status: "APPROVED",
        approvedBy: session.user.id,
        approvedAt: new Date(),
      })
      .where(and(eq(payrolls.id, payrollId), eq(payrolls.orgId, session.orgId)));

    try {
      await createAuditLog({
        action: "hr.payroll_approved",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(payrollId),
        targetType: "payroll",
        metadata: { employeeId: existing.userId, month: existing.month },
      });
    } catch (error) {
      logger.error("Failed to write payroll approval audit log", { payrollId, error });
    }

    if (existing.userId) {
      try {
        const employee = await db.query.users.findFirst({
          where: eq(users.id, existing.userId),
          columns: { email: true, name: true },
        });
        if (employee?.email) {
          await sendPayrollApprovedEmail(
            employee.email,
            employee.name ?? "Employee",
            existing.month ?? "Current Month",
            session.user.name ?? "Admin"
          );
        }
      } catch (error) {
        logger.error("Failed to send payroll approved email", { payrollId, error });
      }
    }

    return ok({ success: true });
  });
}
