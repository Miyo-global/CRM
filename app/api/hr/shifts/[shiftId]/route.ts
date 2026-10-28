import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { shifts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { formatShiftTime } from "@/lib/hr/shifts";
import { updateShiftSchema } from "@/lib/validations/shifts";
import type { NextRequest } from "next/server";

/** Edit a shift, or archive / restore it with isActive. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ shiftId: string }> }) {
  return withAdmin(async (session) => {
    const shiftId = Number((await params).shiftId);
    if (!Number.isInteger(shiftId) || shiftId <= 0) return err("Invalid shift ID.", 400);

    const existing = await db.query.shifts.findFirst({
      where: and(eq(shifts.id, shiftId), eq(shifts.orgId, session.orgId)),
    });
    if (!existing) return err("Shift not found.", 404);

    const body = await parseBody(req, updateShiftSchema);
    const start = body.startTime ?? formatShiftTime(existing.startTime);
    const end = body.endTime ?? formatShiftTime(existing.endTime);
    if (start === end) return err("Start and end time must differ", 400);

    const [updated] = await db
      .update(shifts)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(shifts.id, shiftId), eq(shifts.orgId, session.orgId)))
      .returning();
    return ok(updated);
  });
}
