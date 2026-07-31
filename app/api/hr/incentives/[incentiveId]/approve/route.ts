import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { incentives } from "@/lib/db/schema/crm";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";

const approveIncentiveSchema = z.object({
  approvedAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a non-negative amount with up to 2 decimals")
    .refine((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 && n <= 100_000_000;
    }, "Amount must be positive and at most 10 crore"),
  notes: z.string().max(2000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ incentiveId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can approve incentives.", 403);
    }

    const { incentiveId: id } = await params;
    const incentiveId = Number(id);
    if (!incentiveId) return err("Invalid incentive ID.", 400);

    const body = await parseBody(req, approveIncentiveSchema);

    const existing = await db.query.incentives.findFirst({
      where: and(eq(incentives.id, incentiveId), eq(incentives.orgId, session.orgId)),
    });

    if (!existing) return err("Incentive not found.", 404);
    if (existing.status !== "PENDING") {
      return err(`Only pending incentives can be approved (current status: ${existing.status}).`, 409);
    }

    await db
      .update(incentives)
      .set({
        status: "APPROVED",
        approvedAmount: body.approvedAmount,
        approvedBy: session.user.id,
        approvedAt: new Date(),
        notes: body.notes ?? existing.notes,
      })
      .where(eq(incentives.id, incentiveId));

    return ok({ success: true });
  });
}
