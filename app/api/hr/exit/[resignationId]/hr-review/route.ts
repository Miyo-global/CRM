import { withAdmin, err, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { resignations, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { z } from "zod";
import type { NextRequest } from "next/server";

const hrReviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  remarks: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ resignationId: string }> }
) {
  return withAdmin(async (session) => {
    if (session.user.role !== "HR" && session.user.role !== "CEO") {
      return err("Only HR can perform HR review.", 403);
    }

    const { resignationId: id } = await params;
    const resignationId = Number(id);
    if (!resignationId) return err("Invalid ID.", 400);

    const body = await parseBody(req, hrReviewSchema);
    if (!body.decision) return err("decision is required.", 400);
    if (body.decision === "reject" && !body.remarks) return err("Remarks required for rejection.", 400);

    const record = await db.query.resignations.findFirst({
      where: and(eq(resignations.id, resignationId), eq(resignations.orgId, session.orgId)),
    });
    if (!record) return err("Resignation not found.", 404);
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
        updatedAt: new Date(),
      })
      .where(eq(resignations.id, resignationId));

    if (newStatus === "HR_APPROVED") {
      const employee = await db.query.users.findFirst({
        where: eq(users.id, record.userId),
        columns: { name: true },
      });
      void inngest.send({
        name: "hr/resignation.hr_approved",
        data: {
          resignationId,
          orgId: session.orgId,
          employeeName: employee?.name ?? "Employee",
          employeeId: record.userId,
        },
      });
    }

    return ok({ success: true });
  });
}
