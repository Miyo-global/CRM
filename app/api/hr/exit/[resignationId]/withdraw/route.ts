import { withAuth, err, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { resignations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ resignationId: string }> }
) {
  return withAuth(async (session) => {
    const { resignationId: id } = await params;
    const resignationId = Number(id);
    if (!resignationId) return err("Invalid ID.", 400);

    const record = await db.query.resignations.findFirst({
      where: and(eq(resignations.id, resignationId), eq(resignations.orgId, session.orgId)),
    });
    if (!record) return err("Resignation not found.", 404);

    const isAdmin = session.user.role === "CEO" || session.user.role === "HR";
    if (!isAdmin && record.userId !== session.user.id) {
      return err("You can only withdraw your own resignation.", 403);
    }

    const nonWithdrawableStatuses = ["CEO_APPROVED", "IN_PROGRESS", "COMPLETED", "WITHDRAWN"];
    if (nonWithdrawableStatuses.includes(record.status ?? "")) {
      return err("Resignation cannot be withdrawn at this stage.", 400);
    }

    await db.update(resignations)
      .set({ status: "WITHDRAWN", updatedAt: new Date() })
      .where(eq(resignations.id, resignationId));

    return ok({ success: true });
  });
}
