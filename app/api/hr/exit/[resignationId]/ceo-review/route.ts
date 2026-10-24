import { withAuth, err, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { resignations, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createAuditLog } from "@/lib/audit-log";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { isExitFinalApprover } from "@/lib/constants/roles";
import { after } from "next/server";
import { format } from "date-fns";
import { sendResignationApprovedEmail } from "@/lib/email";
import { createTerminationFromResignation } from "@/lib/hr/resignation-termination";

const ceoReviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  remarks: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ resignationId: string }> }
) {
  return withAuth(async (session) => {
    if (!isExitFinalApprover(session.user.role)) return err("Only the CEO or an Admin can give the final sign-off.", 403);

    const { resignationId: id } = await params;
    const resignationId = Number(id);
    if (!resignationId) return err("Invalid ID.", 400);

    const body = await parseBody(req, ceoReviewSchema);
    if (!body.decision) return err("decision is required.", 400);
    if (body.decision === "reject" && !body.remarks) return err("Remarks required for rejection.", 400);

    const record = await db.query.resignations.findFirst({
      where: and(eq(resignations.id, resignationId), eq(resignations.orgId, session.orgId)),
    });
    if (!record) return err("Resignation not found.", 404);
    if (record.userId === session.user.id) return err("You cannot sign off your own resignation.", 403);
    if (record.status !== "HR_APPROVED") return err("Resignation must be HR-approved first.", 400);

    const approved = body.decision === "approve";

    await db.update(resignations)
      .set({
        status: approved ? "CEO_APPROVED" : "REJECTED",
        ceoReviewedBy: session.user.id,
        ceoReviewedAt: new Date(),
        ceoRemarks: body.remarks,
        updatedAt: new Date(),
      })
      .where(eq(resignations.id, resignationId));

    void createAuditLog({
      action: "hr.resignation_signed_off",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(resignationId),
      targetType: "resignation",
      metadata: {
        employeeId: record.userId,
        decision: body.decision,
        from: record.status,
        to: approved ? "CEO_APPROVED" : "REJECTED",
        remarks: body.remarks,
      },
    }).catch(() => undefined);

    // The employee hears about the final decision by email (R3-0009).
    if (approved) {
      await createTerminationFromResignation(record, session.user.id);
      const employee = await db.query.users.findFirst({
        where: eq(users.id, record.userId),
        columns: { email: true, name: true },
      });
      if (employee?.email) {
        const to = employee.email;
        const lastWorkingDay = record.lastWorkingDate
          ? new Date(record.lastWorkingDate)
          : new Date();
        after(() => sendResignationApprovedEmail(to, lastWorkingDay).catch(() => undefined));
      }
    }

    return ok({ success: true });
  });
}
