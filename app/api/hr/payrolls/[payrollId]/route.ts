import { withAdmin, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { payrolls } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { createAuditLog } from "@/lib/audit-log";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ payrollId: string }> }
) {
  return withAdmin(async (session) => {
    const { payrollId: id } = await params;
    const payrollId = Number(id);
    if (!payrollId) return err("Invalid payroll ID.", 400);

    const existing = await db.query.payrolls.findFirst({
      where: and(eq(payrolls.id, payrollId), eq(payrolls.orgId, session.orgId)),
      columns: { id: true, status: true, userId: true, month: true },
    });

    if (!existing) return err("Payroll not found.", 404);
    if (existing.status !== "DRAFT") {
      return err("Only draft payroll records can be deleted. Approve or paid payrolls cannot be removed from here.", 400);
    }

    await db.delete(payrolls).where(and(eq(payrolls.id, payrollId), eq(payrolls.orgId, session.orgId)));

    void createAuditLog({
      action: "hr.payroll_deleted",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(payrollId),
      targetType: "payroll",
      metadata: { employeeId: existing.userId, month: existing.month },
    }).catch(() => {});

    return ok({ success: true });
  });
}
