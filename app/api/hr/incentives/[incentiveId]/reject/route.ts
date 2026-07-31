import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { incentives } from "@/lib/db/schema/crm";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ incentiveId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can reject incentives.", 403);
    }

    const { incentiveId: id } = await params;
    const incentiveId = Number(id);
    if (!incentiveId) return err("Invalid incentive ID.", 400);

    const existing = await db.query.incentives.findFirst({
      where: and(eq(incentives.id, incentiveId), eq(incentives.orgId, session.orgId)),
    });

    if (!existing) return err("Incentive not found.", 404);
    if (existing.status !== "PENDING") {
      return err(`Only pending incentives can be rejected (current status: ${existing.status}).`, 409);
    }

    await db
      .update(incentives)
      .set({ status: "REJECTED" })
      .where(and(eq(incentives.id, incentiveId), eq(incentives.orgId, session.orgId)));

    return ok({ success: true });
  });
}
