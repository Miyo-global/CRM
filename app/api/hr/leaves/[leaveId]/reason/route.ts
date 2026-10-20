import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { leaveRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { leaveReasonSchema } from "@/lib/validations/leave-request";

const bodySchema = z.object({ reason: leaveReasonSchema });

/**
 * The owner rewrites the reason of a request nobody has decided yet
 * (QA-BUG-17). Dates and type stay fixed: changing those means cancelling and
 * applying again, so the balance checks run.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leaveId: string }> },
) {
  return withAuth(async (session) => {
    const { leaveId: id } = await params;
    const leaveId = Number(id);
    if (!Number.isInteger(leaveId) || leaveId <= 0) return err("Invalid leave request ID.", 400);

    const existing = await db.query.leaveRequests.findFirst({
      where: and(eq(leaveRequests.id, leaveId), eq(leaveRequests.orgId, session.orgId)),
      columns: { id: true, userId: true, status: true },
    });
    if (!existing) return err("Leave request not found.", 404);
    if (existing.userId !== session.user.id) return err("You can only edit your own leave requests.", 403);
    if (existing.status !== "PENDING") return err("Only pending leave requests can be edited.", 400);

    const body = await parseBody(req, bodySchema);

    // Conditional on PENDING, so an approval that lands first wins.
    const [row] = await db
      .update(leaveRequests)
      .set({ reason: body.reason })
      .where(and(eq(leaveRequests.id, leaveId), eq(leaveRequests.status, "PENDING")))
      .returning({ id: leaveRequests.id });
    if (!row) return err("This request was just decided. Refresh to see its status.", 409);

    return ok({ success: true });
  });
}
