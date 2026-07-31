import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { holidayWorkRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { createNotification } from "@/server/actions/create-notification";
import type { NextRequest } from "next/server";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can approve holiday work requests.", 403);
    }

    const { id } = await params;
    const requestId = Number(id);
    if (!requestId) return err("Invalid request ID.", 400);

    const request = await db.query.holidayWorkRequests.findFirst({
      where: and(
        eq(holidayWorkRequests.id, requestId),
        eq(holidayWorkRequests.orgId, session.orgId)
      ),
    });
    if (!request) return err("Request not found.", 404);
    if (request.status !== "PENDING") {
      return err(`Request is already ${request.status.toLowerCase()}.`, 400);
    }

    const [updated] = await db
      .update(holidayWorkRequests)
      .set({
        status: "APPROVED",
        approvedBy: session.user.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(holidayWorkRequests.id, requestId))
      .returning();

    void createNotification({
      userId: request.userId,
      orgId: session.orgId,
      title: "Holiday work request approved",
      message: `Your request to work on ${request.requestDate} has been approved. Compensation: ${request.compensationPreference.replace("_", " ")}.`,
      link: "/hr/attendance",
    }).catch(() => {});

    return ok(updated);
  });
}
