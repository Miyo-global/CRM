import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { reimbursements } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PAID"]),
  rejectionReason: z.string().max(500).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reimbursementId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) return err("Only admins can process reimbursements.", 403);
    const { reimbursementId: id } = await params;
    const reimbursementId = Number(id);
    if (!reimbursementId) return err("Invalid ID.", 400);

    const existing = await db.query.reimbursements.findFirst({
      where: and(eq(reimbursements.id, reimbursementId), eq(reimbursements.orgId, session.orgId)),
    });
    if (!existing) return err("Not found.", 404);

    const body = updateSchema.parse(await req.json());
    await db.update(reimbursements).set({
      status: body.status,
      ...(body.status === "APPROVED" && { approvedBy: session.user.id, approvedAt: new Date() }),
      ...(body.status === "PAID" && { paidAt: new Date() }),
      ...(body.rejectionReason && { rejectionReason: body.rejectionReason }),
      updatedAt: new Date(),
    }).where(eq(reimbursements.id, reimbursementId));

    return ok({ success: true });
  });
}
