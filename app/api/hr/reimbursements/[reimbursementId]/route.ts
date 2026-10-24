import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { canDecideRequest } from "@/lib/auth/separation-of-duties";
import { db } from "@/lib/db";
import { expenses, reimbursements } from "@/lib/db/schema";
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
      with: { user: { columns: { id: true, role: true } } },
    });
    if (!existing) return err("Not found.", 404);
    const duty = canDecideRequest(session.user, { id: existing.userId, role: existing.user?.role });
    if (!duty.allowed) return err(duty.message, 403);

    const body = updateSchema.parse(await req.json());
    await db.update(reimbursements).set({
      status: body.status,
      ...(body.status === "APPROVED" && { approvedBy: session.user.id, approvedAt: new Date() }),
      ...(body.status === "PAID" && { paidAt: new Date() }),
      ...(body.rejectionReason && { rejectionReason: body.rejectionReason }),
      updatedAt: new Date(),
    }).where(eq(reimbursements.id, reimbursementId));

    // Paying from Reimbursements closes the expense claim it came from too, so
    // the two pages never disagree (R3-HR-01).
    if (body.status === "PAID" && existing.expenseId) {
      await db.update(expenses).set({ status: "PAID", paidAt: new Date(), updatedAt: new Date() })
        .where(and(eq(expenses.id, existing.expenseId), eq(expenses.orgId, session.orgId), eq(expenses.status, "APPROVED")));
    }

    return ok({ success: true });
  });
}
