import { withAuth, ok, err, type AuthSession } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, leaveTypes, users, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { writeAuditLog } from "@/lib/db/audit";
import type { NextRequest } from "next/server";
import { sendLeaveCancellationEmail } from "@/lib/email";
import { canApproveLeaveRequest } from "@/lib/auth/leave-approval";
import { restoreApprovedLeaveBalance } from "@/lib/hr/deduct-leave-balance";
import { createNotification } from "@/server/actions/create-notification";
import { afterResponse } from "@/lib/after-response";

type LeaveRow = typeof leaveRequests.$inferSelect;

/**
 * Same people who could approve it may cancel it (the approver chain, never
 * your own), and the same balance restore the revert route uses (R3-0020).
 */
async function cancelApprovedLeave(session: AuthSession, existing: LeaveRow) {
  const check = await canApproveLeaveRequest(session, {
    userId: existing.userId,
    approverId: existing.approverId,
    status: "PENDING",
  });
  if (!check.allowed) {
    return err(
      existing.userId === session.user.id
        ? "Ask HR or an Admin to cancel your approved leave."
        : check.message,
      check.status,
    );
  }

  const changed = await db.transaction(async (tx) => {
    // Conditional on APPROVED, so a double click cannot restore twice.
    const [row] = await tx
      .update(leaveRequests)
      .set({ status: "CANCELLED" })
      .where(and(eq(leaveRequests.id, existing.id), eq(leaveRequests.status, "APPROVED")))
      .returning({ id: leaveRequests.id });
    if (!row) return false;
    await restoreApprovedLeaveBalance(tx, existing);
    return true;
  });
  if (!changed) {
    return err("This leave request was just changed by someone else. Refresh to see its current status.", 409);
  }

  await writeAuditLog({
    action: "hr.leave_cancelled",
    userId: session.user.id,
    orgId: session.orgId,
    targetId: String(existing.id),
    targetType: "leave_request",
    metadata: { previousStatus: "APPROVED", employeeId: existing.userId },
  });

  void createNotification({
    orgId: session.orgId,
    userId: existing.userId,
    type: "WARNING",
    title: "Approved leave cancelled",
    message: `Your approved leave from ${existing.startDate} to ${existing.endDate} was cancelled by ${session.user.name ?? "an approver"}. The days are back in your balance.`,
    link: "/hr/leaves",
  }).catch(() => {});

  return ok({ success: true });
}

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

    // An approver cancels an approved leave in one step, balance restored.
    // It used to take "Revert to Pending" then "Cancel" (QA-BUG-36).
    if (existing.status === "APPROVED") return cancelApprovedLeave(session, existing);

    if (existing.userId !== session.user.id) {
      return err("You can only cancel your own leave requests.", 403);
    }
    if (existing.status !== "PENDING") {
      return err("Only pending leave requests can be cancelled.", 400);
    }

    // Conditional on PENDING: an approval landing between the read and this
    // write has already deducted the balance, so it must not be overwritten.
    const [cancelled] = await db
      .update(leaveRequests)
      .set({ status: "CANCELLED" })
      .where(and(eq(leaveRequests.id, leaveId), eq(leaveRequests.status, "PENDING")))
      .returning({ id: leaveRequests.id });
    if (!cancelled) {
      return err("This leave request was just changed by someone else. Refresh to see its current status.", 409);
    }

    await writeAuditLog({
      action: "hr.leave_cancelled",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(leaveId),
      targetType: "leave_request",
    });

    afterResponse("hr/leaves/[leaveId]/cancel", async () => {
      const leaveType = existing.leaveTypeId
        ? await db.query.leaveTypes.findFirst({
            where: eq(leaveTypes.id, existing.leaveTypeId),
            columns: { name: true },
          })
        : null;

      // The approver who owned the request (HR when nobody did), plus the
      // employee as a confirmation (R3-0006). Previously only HR heard.
      const recipientIds = new Set<string>([existing.userId]);
      if (existing.approverId) {
        recipientIds.add(existing.approverId);
      } else {
        const hrMembers = await db
          .select({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .where(and(eq(organizationMembers.orgId, session.orgId), eq(organizationMembers.role, "HR")));
        for (const m of hrMembers) recipientIds.add(m.userId);
      }

      for (const userId of recipientIds) {
        const recipient = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { email: true, name: true },
        });
        if (recipient?.email) {
          await sendLeaveCancellationEmail(
            recipient.email,
            session.user.name ?? "Employee",
            leaveType?.name ?? "Leave",
            existing.startDate === existing.endDate
              ? existing.startDate
              : `${existing.startDate} – ${existing.endDate}`,
            existing.status ?? "PENDING",
          );
        }
      }
    });

    return ok({ success: true });
  });
}
