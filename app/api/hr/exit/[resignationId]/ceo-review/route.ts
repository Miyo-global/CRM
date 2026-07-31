import { withAuth, err, ok, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { resignations, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { z } from "zod";
import type { NextRequest } from "next/server";

const ceoReviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  remarks: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ resignationId: string }> }
) {
  return withAuth(async (session) => {
    if (session.user.role !== "CEO") return err("Only CEO can perform CEO review.", 403);

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

    void inngest.send({
      name: "hr/resignation.ceo_approved",
      data: { resignationId, orgId: session.orgId, employeeId: record.userId, approved },
    });

    return ok({ success: true });
  });
}
