import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, leaveTypes, users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { writeAuditLog } from "@/lib/db/audit";
import type { NextRequest } from "next/server";
import { sendLeaveCancellationEmail } from "@/lib/email";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ leaveId: string }> },
) {
  return withAuth(async (session) => {
    const { leaveId: id } = await params;
    const leaveId = Number(id);
    if (isNaN(leaveId)) return err("Invalid leave request ID.", 400);

    const existing = await db.query.leaveRequests.findFirst({
      where: and(
        eq(leaveRequests.id, leaveId),
        eq(leaveRequests.orgId, session.orgId),
      ),
    });
    if (!existing) return err("Leave request not found.", 404);

    if (existing.userId !== session.user.id) {
      return err("You can only cancel your own leave requests.", 403);
    }
    if (existing.status !== "PENDING") {
      return err("Only pending leave requests can be cancelled.", 400);
    }

    await db
      .update(leaveRequests)
      .set({ status: "CANCELLED" })
      .where(eq(leaveRequests.id, leaveId));

    await writeAuditLog({
      action: "hr.leave_cancelled",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(leaveId),
      targetType: "leave_request",
    });

    void (async () => {
      const leaveType = existing.leaveTypeId
        ? await db.query.leaveTypes.findFirst({
            where: eq(leaveTypes.id, existing.leaveTypeId),
            columns: { name: true },
          })
        : null;

      const hrMembers = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(and(eq(organizationMembers.orgId, session.orgId), eq(organizationMembers.role, "HR")));

      for (const m of hrMembers) {
        const hrUser = await db.query.users.findFirst({
          where: eq(users.id, m.userId),
          columns: { email: true, name: true },
        });
        if (hrUser?.email) {
          await sendLeaveCancellationEmail(
            hrUser.email,
            hrUser.name ?? "HR",
            session.user.name ?? "Employee",
            leaveType?.name ?? "Leave",
            existing.startDate,
            existing.endDate
          );
        }
      }
    })().catch(() => {});

    return ok({ success: true });
  });
}
