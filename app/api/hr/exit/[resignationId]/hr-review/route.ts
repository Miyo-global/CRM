import { withAdmin, err, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { resignations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";
import { getTodayString } from "@/lib/date-utils";
import type { NextRequest } from "next/server";

const hrReviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  remarks: z.string().optional(),
  /** HR may move the last working day when accepting (R2-TERM-05). */
  lastWorkingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Last working day must be a date").optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ resignationId: string }> }
) {
  // R2-TERM-05: HR review is open to every admin role (HR, Admin, Super
  // Admin); Admins had no one to hand the step to.
  return withAdmin(async (session) => {
    const { resignationId: id } = await params;
    const resignationId = Number(id);
    if (!resignationId) return err("Invalid ID.", 400);

    const body = await parseBody(req, hrReviewSchema);
    if (!body.decision) return err("decision is required.", 400);
    if (body.decision === "reject" && !body.remarks) return err("Remarks required for rejection.", 400);
    // A past day would let the daily job lock the employee out at once.
    if (body.lastWorkingDate && body.lastWorkingDate <= getTodayString()) {
      return err("Last working day must be after today.", 400);
    }

    const record = await db.query.resignations.findFirst({
      where: and(eq(resignations.id, resignationId), eq(resignations.orgId, session.orgId)),
    });
    if (!record) return err("Resignation not found.", 404);
    if (record.userId === session.user.id) return err("You cannot review your own resignation.", 403);
    if (record.status !== "PENDING_HR" && record.status !== "SUBMITTED") {
      return err("Resignation is not pending HR review.", 400);
    }

    const newStatus = body.decision === "approve" ? "HR_APPROVED" : "REJECTED";

    await db.update(resignations)
      .set({
        status: newStatus,
        hrReviewedBy: session.user.id,
        hrReviewedAt: new Date(),
        hrRemarks: body.remarks,
        ...(body.decision === "approve" && body.lastWorkingDate
          ? { lastWorkingDate: body.lastWorkingDate }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(resignations.id, resignationId));

    const lwdChanged =
      body.decision === "approve" && body.lastWorkingDate && body.lastWorkingDate !== record.lastWorkingDate;
    void createAuditLog({
      action: "hr.resignation_reviewed",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(resignationId),
      targetType: "resignation",
      metadata: {
        employeeId: record.userId,
        decision: body.decision,
        from: record.status,
        to: newStatus,
        remarks: body.remarks,
        ...(lwdChanged ? { lastWorkingDate: { from: record.lastWorkingDate, to: body.lastWorkingDate } } : {}),
      },
    }).catch(() => undefined);

    return ok({ success: true });
  });
}
