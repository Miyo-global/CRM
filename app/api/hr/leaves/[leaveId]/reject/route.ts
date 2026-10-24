import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveBalances, leaveRequests, leaveTypes, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { writeAuditLog } from "@/lib/db/audit";
import { createNotification } from "@/server/actions/create-notification";
import { sendLeaveStatusUpdateEmail } from "@/lib/email";
import { canApproveLeaveRequest } from "@/lib/auth/leave-approval";
import { z } from "zod";
import type { NextRequest } from "next/server";

const bodySchema = z.object({
  // A rejection with no reason left the employee nothing to act on
  // (QA-0071).
  reason: z.string().trim().min(1, "Give a reason for the rejection.").max(500),
  comment: z.string().max(1000).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ leaveId: string }> },
) {
  return withAuth(async (session) => {
    const { leaveId: id } = await params;
    const leaveId = Number(id);
    if (isNaN(leaveId)) return err("Invalid leave request ID.", 400);

    let reason: string;
    let comment: string | undefined;
    try {
      const parsed = bodySchema.safeParse(await req.json());
      if (!parsed.success) {
        return err(
          parsed.error.issues[0]?.message ?? "Give a reason for the rejection.",
          400,
        );
      }
      reason = parsed.data.reason;
      comment = parsed.data.comment;
    } catch {
      return err("Give a reason for the rejection.", 400);
    }

    const existing = await db.query.leaveRequests.findFirst({
      where: and(
        eq(leaveRequests.id, leaveId),
        eq(leaveRequests.orgId, session.orgId),
      ),
    });
    if (!existing) return err("Leave request not found.", 404);
    if (existing.status !== "PENDING") {
      return err(`Cannot reject a request with status: ${existing.status}.`, 400);
    }
    const authCheck = await canApproveLeaveRequest(session, existing);
    if (!authCheck.allowed) {
      return err(authCheck.message, authCheck.status);
    }

    await db
      .update(leaveRequests)
      .set({
        status: "REJECTED",
        approverId: session.user.id,
        rejectionReason: reason,
        managerComment: comment ?? null,
      })
      .where(eq(leaveRequests.id, leaveId));

    // The rejection mail states the balance that is still available (QA-0011).
    const balanceRow = existing.leaveTypeId
      ? await db.query.leaveBalances.findFirst({
          orderBy: (b, { asc }) => [asc(b.id)], // oldest row (R3-PRJ-08)
          where: and(
            eq(leaveBalances.userId, existing.userId),
            eq(leaveBalances.leaveTypeId, existing.leaveTypeId),
            eq(leaveBalances.year, new Date(`${existing.startDate}T00:00:00Z`).getUTCFullYear()),
          ),
          columns: { balance: true },
        })
      : null;
    const balanceAfter = balanceRow ? Number(balanceRow.balance) : null;

    const [employee, leaveType] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, existing.userId),
        columns: { email: true, name: true },
      }),
      existing.leaveTypeId
        ? db.query.leaveTypes.findFirst({
            where: eq(leaveTypes.id, existing.leaveTypeId),
            columns: { name: true },
          })
        : Promise.resolve(null),
    ]);

    await Promise.all([
      createNotification({
        orgId: session.orgId,
        userId: existing.userId,
        type: "ERROR",
        title: "Leave Rejected",
        message: `Your leave request has been rejected. Reason: ${reason}${comment ? ` — "${comment}"` : ""}`,
        link: "/hr/leaves",
      }),
      writeAuditLog({
        action: "hr.leave_rejected",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(leaveId),
        targetType: "leave_request",
        metadata: { reason, comment },
      }),
      employee?.email
        ? sendLeaveStatusUpdateEmail(
            employee.email,
            employee.name ?? "Employee",
            leaveType?.name ?? "Leave",
            existing.startDate,
            existing.endDate,
            "REJECTED",
            session.user.name ?? "HR",
            reason,
            balanceAfter,
          ).catch(() => undefined)
        : Promise.resolve(),
    ]);

    return ok({ success: true });
  }, req);
}
