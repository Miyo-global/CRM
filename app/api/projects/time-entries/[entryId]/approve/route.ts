

import { NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { timesheets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";

type RouteParams = { params: Promise<{ entryId: string }> };

export async function PATCH(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can approve timesheets", 403);
    }

    const { entryId } = await params;
    const id = Number(entryId);
    if (!id) return err("Invalid entry id", 400);

    const entry = await db.query.timesheets.findFirst({
      where: and(eq(timesheets.id, id), eq(timesheets.orgId, session.orgId!)),
    });
    if (!entry) return err("Time entry not found", 404);

    if (entry.userId === session.user.id) {
      return err("You cannot approve your own timesheet", 403);
    }

    if (entry.status !== "PENDING") {
      return err("Only pending entries can be approved", 400);
    }

    await db
      .update(timesheets)
      .set({
        status: "APPROVED",
        approvedBy: session.user.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(timesheets.id, id));

    return ok({ success: true });
  });
}
