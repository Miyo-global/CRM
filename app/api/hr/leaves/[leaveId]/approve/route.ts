import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, leaveTypes, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { writeAuditLog } from "@/lib/db/audit";
import { createNotification } from "@/server/actions/create-notification";
import { resolveRequestNotifications } from "@/lib/notifications/resolve";
import { sendLeaveStatusUpdateEmail } from "@/lib/email";
import { canApproveLeaveRequest } from "@/lib/auth/leave-approval";
import { deductApprovedLeaveBalance } from "@/lib/hr/deduct-leave-balance";
import { z } from "zod";
import type { NextRequest } from "next/server";

const bodySchema = z.object({
  comment: z.string().optional(),
  forceApprove: z.boolean().optional(),
  justification: z.string().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ leaveId: string }> },
) {
  return withAuth(async (session) => {
    const { leaveId: id } = await params;
    const leaveId = Number(id);
    if (isNaN(leaveId)) return err("Invalid leave request ID.", 400);

    let comment: string | undefined;
    try {
      const raw = await req.json() as unknown;
      const parsed = bodySchema.safeParse(raw);
      if (parsed.success) {
        comment = parsed.data.comment;
      }
    } catch {
      comment = undefined;
    }

    const existing = await db.query.leaveRequests.findFirst({
      where: and(
        eq(leaveRequests.id, leaveId),
        eq(leaveRequests.orgId, session.orgId),
      ),
    });
    if (!existing) return err("Leave request not found.", 404);
    if (existing.status !== "PENDING") {
      return err(`Cannot approve a request with status: ${existing.status}.`, 400);
    }
    const authCheck = await canApproveLeaveRequest(session, existing);
    if (!authCheck.allowed) {
      return err(authCheck.message, authCheck.status);
    }

    let lopDaysApplied = 0;
    let balanceAfter: number | null = null;
    await db.transaction(async (tx) => {
      await tx
        .update(leaveRequests)
        .set({
          status: "APPROVED",
          approverId: session.user.id,
          managerComment: comment ?? null,
        })
        .where(eq(leaveRequests.id, leaveId));

      const deduction = await deductApprovedLeaveBalance(tx, existing);
      lopDaysApplied = deduction.lopDays;
      balanceAfter = deduction.balanceAfter;
    });
    await resolveRequestNotifications(session.orgId, { kind: "leave", leaveId }, "Approved");
    const employee = await db.query.users.findFirst({
      where: eq(users.id, existing.userId),
      columns: { email: true, name: true },
    });
    const leaveTypeName = existing.leaveTypeId
      ? (await db.query.leaveTypes.findFirst({
          where: eq(leaveTypes.id, existing.leaveTypeId),
          columns: { name: true },
        }))?.name ?? "Leave"
      : "Leave";

    await Promise.all([
      createNotification({
        orgId: session.orgId,
        userId: existing.userId,
        type: "SUCCESS",
        title: "Leave Approved",
        message: `Your leave request has been approved.${lopDaysApplied > 0 ? ` Note: ${lopDaysApplied} day(s) will be Loss of Pay (LOP) due to insufficient balance.` : ""}${comment ? ` Manager note: "${comment}"` : ""}`,
        link: "/hr/leaves",
      }),
      writeAuditLog({
        action: "hr.leave_approved",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(leaveId),
        targetType: "leave_request",
        metadata: { comment, lopDaysApplied },
      }),
      employee?.email
        ? sendLeaveStatusUpdateEmail(
            employee.email,
            employee.name ?? "Employee",
            leaveTypeName,
            existing.startDate,
            existing.endDate,
            "APPROVED",
            session.user.name ?? "HR",
            undefined,
            balanceAfter,
          ).catch(() => undefined)
        : Promise.resolve(),
    ]);

    void import("@/lib/webhooks/dispatch").then(({ dispatchWebhook }) =>
      dispatchWebhook(session.orgId, "leave.approved", {
        leaveId,
        userId: existing.userId,
        startDate: existing.startDate,
        endDate: existing.endDate,
        leaveTypeId: existing.leaveTypeId,
      })
    );

    return ok({ success: true });
  }, req);
}
