import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests, leaveBalances, leaveTypes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { resolveLeaveApproverRole, hasLeaveApproverRole } from "@/lib/auth/leave-approval";
import { z } from "zod";
import { LEAVE_POLICY } from "@/lib/leave-policy";
import type { NextRequest } from "next/server";

const updateLeaveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PENDING"]),
  rejectionReason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leaveId: string }> }
) {
  return withAuth(async (session) => {
    const approverRole = await resolveLeaveApproverRole(session);
    if (!hasLeaveApproverRole(approverRole)) {
      return err("Only HR or leadership can approve leave requests.", 403);
    }

    const { leaveId: id } = await params;
    const requestId = Number(id);
    if (Number.isNaN(requestId)) return err("Invalid leave request ID.", 400);

    const body = await parseBody(req, updateLeaveSchema);

    const existing = await db.query.leaveRequests.findFirst({
      where: and(
        eq(leaveRequests.id, requestId),
        eq(leaveRequests.orgId, session.orgId),
      ),
    });

    if (!existing) return err("Leave request not found.", 404);

    if (session.user.id === existing.userId && body.status !== "PENDING") {
      return err("You cannot approve or reject your own leave request.", 403);
    }

    await db.transaction(async (tx) => {
      await tx
        .update(leaveRequests)
        .set({
          status: body.status,
          approverId: body.status !== "PENDING" ? session.user.id : existing.approverId,
          rejectionReason: body.status === "REJECTED" ? (body.rejectionReason ?? null) : null,
        })
        .where(eq(leaveRequests.id, requestId));

      const isRestoreTransition =
        body.status !== "APPROVED" && existing.status === "APPROVED";
      const isDebitTransition =
        body.status === "APPROVED" && existing.status !== "APPROVED";

      if ((isRestoreTransition || isDebitTransition) && existing.leaveTypeId) {
        const leaveType = await tx.query.leaveTypes.findFirst({
          where: eq(leaveTypes.id, existing.leaveTypeId),
          columns: { name: true },
        });

        if (leaveType?.name !== LEAVE_POLICY.UNPAID.name) {
          const start = new Date(existing.startDate);
          const end = new Date(existing.endDate);
          let diffDays = existing.isHalfDay ? 0.5 : 0;
          if (!existing.isHalfDay) {
            const cursor = new Date(start);
            while (cursor <= end) {
              const day = cursor.getDay();
              if (day !== 0 && day !== 6) diffDays++;
              cursor.setDate(cursor.getDate() + 1);
            }
          }

          const balanceRecord = await tx.query.leaveBalances.findFirst({
            where: and(
              eq(leaveBalances.userId, existing.userId),
              eq(leaveBalances.leaveTypeId, existing.leaveTypeId),
              eq(leaveBalances.year, new Date().getFullYear()),
            ),
          });

          if (balanceRecord) {
            if (isRestoreTransition) {
              const prevLopDays = Number(existing.lopDays ?? 0);
              const paidDays = diffDays - prevLopDays;
              const restored = Number(balanceRecord.balance) + paidDays;
              await tx.update(leaveBalances)
                .set({ balance: restored.toString() })
                .where(eq(leaveBalances.id, balanceRecord.id));
              await tx.update(leaveRequests)
                .set({ lopDays: "0" })
                .where(eq(leaveRequests.id, requestId));
            } else {
              const available = Number(balanceRecord.balance);
              const lopDays = available <= 0 ? diffDays : Math.max(0, diffDays - available);
              const paidDays = diffDays - lopDays;
              const newBal = Math.max(0, available - paidDays);
              await tx.update(leaveRequests)
                .set({ lopDays: lopDays.toString() })
                .where(eq(leaveRequests.id, requestId));
              await tx.update(leaveBalances)
                .set({ balance: newBal.toString() })
                .where(eq(leaveBalances.id, balanceRecord.id));
            }
          }
        }
      }
    });

    return ok({ success: true });
  });
}
