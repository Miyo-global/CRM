import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { canManageHolidays } from "@/lib/constants/roles";
import { db } from "@/lib/db";
import { holidays } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { updateHolidaySchema } from "@/lib/validations/holidays";
import { findHolidayConflict } from "@/lib/hr/holiday-conflict";
import type { NextRequest } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ holidayId: string }> }
) {
  return withAuth(async (session) => {
    if (!canManageHolidays(session.user.role)) {
      return err("Only admins can update holidays.", 403);
    }

    const { holidayId: id } = await params;
    const holidayId = Number(id);
    if (!holidayId) return err("Invalid holiday ID.", 400);

    const existing = await db.query.holidays.findFirst({
      where: and(eq(holidays.id, holidayId), eq(holidays.orgId, session.orgId)),
    });
    if (!existing) return err("Holiday not found.", 404);

    const body = await parseBody(req, updateHolidaySchema);
    const patch: Record<string, unknown> = { updatedAt: new Date() };

    // As typed, no title-casing (QA-BUG-18).
    if (body.name !== undefined) patch.name = body.name;
    const newDate = body.date !== undefined ? formatDateOnly(body.date) : existing.date;
    if (newDate !== existing.date || (body.name !== undefined && body.name !== existing.name)) {
      const conflict = await findHolidayConflict(
        session.orgId,
        { name: body.name ?? existing.name, date: newDate },
        holidayId,
      );
      if (conflict) return err(conflict, 409);
    }
    if (newDate !== existing.date) {
      patch.date = newDate;
      patch.notificationSent = false;
    }
    if (body.type !== undefined) patch.type = body.type;
    if (body.message !== undefined) patch.message = body.message;
    if (body.isPublic !== undefined) patch.isPublic = body.isPublic;
    if (body.isHalfDay !== undefined) patch.isHalfDay = body.isHalfDay;

    const [updated] = await db
      .update(holidays)
      .set(patch)
      .where(eq(holidays.id, holidayId))
      .returning();

    return ok(updated);
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ holidayId: string }> }
) {
  return withAuth(async (session) => {
    if (!canManageHolidays(session.user.role)) {
      return err("Only admins can delete holidays.", 403);
    }

    const { holidayId: id } = await params;
    const holidayId = Number(id);
    if (!holidayId) return err("Invalid holiday ID.", 400);

    const existing = await db.query.holidays.findFirst({
      where: and(eq(holidays.id, holidayId), eq(holidays.orgId, session.orgId)),
    });
    if (!existing) return err("Holiday not found.", 404);

    await db.delete(holidays).where(eq(holidays.id, holidayId));
    return ok({ success: true });
  });
}
