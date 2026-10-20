import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests } from "@/lib/db/schema";
import { restoreApprovedLeaveBalance } from "@/lib/hr/deduct-leave-balance";
import { eq, and } from "drizzle-orm";
import { resolveLeaveApproverRole, hasLeaveApproverRole } from "@/lib/auth/leave-approval";
import { z } from "zod";
import type { NextRequest } from "next/server";

// PATCH only reverts a decision to PENDING. Approve and reject go through
// PUT /approve and /reject, which check the approver chain and email the
// employee; deciding here skipped the email (R3-0005).
const updateLeaveSchema = z.object({
  status: z.literal("PENDING"),
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
    // Undoing a decision is a decision: not on your own leave (QA-AUTH-05).
    if (existing.userId === session.user.id) {
      return err("You cannot change the decision on your own leave request.", 403);
    }

    if (existing.status === "PENDING") return ok({ success: true });

    const changed = await db.transaction(async (tx) => {
      // Conditional on the status we read, so a double click cannot debit twice.
      const [row] = await tx
        .update(leaveRequests)
        .set({
          status: body.status,
          rejectionReason: null,
        })
        .where(and(eq(leaveRequests.id, requestId), eq(leaveRequests.status, existing.status!)))
        .returning({ id: leaveRequests.id });
      if (!row) return false;

      // Same helpers as the approve route and auto-approve, so every path
      // debits and restores the same days from the same year (R3-0020).
      if (existing.status === "APPROVED") await restoreApprovedLeaveBalance(tx, existing);
      return true;
    });
    if (!changed) return err("This leave request was just changed by someone else. Refresh to see its current status.", 409);

    return ok({ success: true });
  });
}
