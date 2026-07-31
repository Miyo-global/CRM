import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, leaveBalances, leaveTypes, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { writeAuditLog } from "@/lib/db/audit";
import { createNotification } from "@/server/actions/create-notification";
import { sendLeaveStatusUpdateEmail } from "@/lib/email";
import { canApproveLeaveRequest } from "@/lib/auth/leave-approval";
import { LEAVE_POLICY } from "@/lib/leave-policy";
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
    const authCheck = await canApproveLeaveRequest(session, existing.userId);
    if (!authCheck.allowed) {
      return err(authCheck.message, authCheck.status);
    }

    let lopDaysApplied = 0;
    await db.transaction(async (tx) => {
      await tx
        .update(leaveRequests)
        .set({
          status: "APPROVED",
          approverId: session.user.id,
          managerComment: comment ?? null,
        })
        .where(eq(leaveRequests.id, leaveId));

      if (existing.leaveTypeId) {
        const leaveType = await tx.query.leaveTypes.findFirst({
          where: eq(leaveTypes.id, existing.leaveTypeId),
          columns: { name: true },
        });

        if (leaveType?.name !== LEAVE_POLICY.UNPAID.name) {
          const start = new Date(`${existing.startDate}T00:00:00Z`);
          const end = new Date(`${existing.endDate}T00:00:00Z`);
          let diffDays = existing.isHalfDay ? 0.5 : 0;
          if (!existing.isHalfDay) {
            const cursor = new Date(start);
            while (cursor <= end) {
              const day = cursor.getUTCDay();
              if (day !== 0 && day !== 6) diffDays++;
              cursor.setUTCDate(cursor.getUTCDate() + 1);
            }
          }

          const leaveYear = start.getUTCFullYear();
          const balanceRecord = await tx.query.leaveBalances.findFirst({
            where: and(
              eq(leaveBalances.userId, existing.userId),
              eq(leaveBalances.leaveTypeId, existing.leaveTypeId),
              eq(leaveBalances.year, leaveYear),
            ),
          });

          if (balanceRecord) {
            const available = Number(balanceRecord.balance);
            const lopDays = available <= 0 ? diffDays : Math.max(0, diffDays - available);
            const paidDays = diffDays - lopDays;
            const newBal = Math.max(0, available - paidDays);
            lopDaysApplied = lopDays;

            await tx.update(leaveRequests)
              .set({ lopDays: lopDays.toString() })
              .where(eq(leaveRequests.id, leaveId));
            await tx.update(leaveBalances)
              .set({ balance: newBal.toString() })
              .where(eq(leaveBalances.id, balanceRecord.id));
          }
        }
      }
    });

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
            session.user.name ?? "HR"
          ).catch(() => undefined)
        : Promise.resolve(),
    ]);

    void import("@/lib/inngest/dispatch-webhook").then(({ dispatchWebhook }) =>
      dispatchWebhook(session.orgId, "leave.approved", {
        leaveId,
        userId: existing.userId,
        startDate: existing.startDate,
        endDate: existing.endDate,
        leaveTypeId: existing.leaveTypeId,
      })
    );

    return ok({ success: true });
  });
}
