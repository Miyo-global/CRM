import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { holidayWorkRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { createNotification } from "@/server/actions/create-notification";
import { sendHolidayWorkDecisionEmail } from "@/lib/email/hr-attendance";
import { users } from "@/lib/db/schema";
import type { NextRequest } from "next/server";
import { afterResponse } from "@/lib/after-response";

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

    const compensation = request.compensationPreference.replace(/_/g, " ").toLowerCase();

    void createNotification({
      userId: request.userId,
      orgId: session.orgId,
      title: "Holiday work request approved",
      message: `Your request to work on ${request.requestDate} has been approved. Compensation: ${compensation}.`,
      link: "/hr/attendance",
    }).catch(() => {});

    // MIYO-0241: tell them by email too, not only in the app.
    afterResponse("hr/holiday-work-requests/[id]/approve", async () => {
      const employee = await db.query.users.findFirst({
        where: eq(users.id, request.userId),
        columns: { email: true },
      });
      if (!employee?.email) return;
      await sendHolidayWorkDecisionEmail(employee.email, "approved", {
        date: request.requestDate,
        compensation,
      });
    });

    return ok(updated);
  });
}
