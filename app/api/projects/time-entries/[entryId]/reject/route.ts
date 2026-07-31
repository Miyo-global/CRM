

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { timesheets } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";

const rejectSchema = z.object({
  reason: z.string().optional(),
});

type RouteParams = { params: Promise<{ entryId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can reject timesheets", 403);
    }

    const { entryId } = await params;
    const id = Number(entryId);
    if (!id) return err("Invalid entry id", 400);

    const entry = await db.query.timesheets.findFirst({
      where: and(eq(timesheets.id, id), eq(timesheets.orgId, session.orgId!)),
    });
    if (!entry) return err("Time entry not found", 404);

    if (entry.status !== "PENDING") {
      return err("Only pending entries can be rejected", 400);
    }

    const body = await parseBody(req, rejectSchema);

    await db
      .update(timesheets)
      .set({
        status: "REJECTED",
        rejectionReason: body.reason ?? null,
        updatedAt: new Date(),
      })
      .where(eq(timesheets.id, id));

    return ok({ success: true });
  });
}
