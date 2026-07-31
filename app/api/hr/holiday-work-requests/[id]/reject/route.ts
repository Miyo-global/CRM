import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { holidayWorkRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { createNotification } from "@/server/actions/create-notification";
import { z } from "zod";
import type { NextRequest } from "next/server";

const rejectSchema = z.object({
  rejectionReason: z.string().min(1),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can reject holiday work requests.", 403);
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

    const body = await parseBody(req, rejectSchema);

    const [updated] = await db
      .update(holidayWorkRequests)
      .set({
        status: "REJECTED",
        rejectionReason: body.rejectionReason,
        updatedAt: new Date(),
      })
      .where(eq(holidayWorkRequests.id, requestId))
      .returning();

    void createNotification({
      userId: request.userId,
      orgId: session.orgId,
      title: "Holiday work request rejected",
      message: `Your request to work on ${request.requestDate} was rejected. Reason: ${body.rejectionReason}`,
      link: "/hr/attendance",
    }).catch(() => {});

    return ok(updated);
  });
}
