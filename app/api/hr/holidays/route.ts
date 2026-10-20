import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getHolidays } from "@/server/queries/hr";
import { canManageHolidays } from "@/lib/constants/roles";
import { db } from "@/lib/db";
import { holidays } from "@/lib/db/schema";
import { findHolidayConflict } from "@/lib/hr/holiday-conflict";
import { formatDateOnly, getTodayString } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { createHolidaySchema } from "@/lib/validations/holidays";
import { sendHolidayReminderIfDue } from "@/server/actions/holiday-actions";
import { rejectDuplicateSubmit } from "@/lib/api/submit-guard";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const yearParam = req.nextUrl.searchParams.get("year");
    const year = yearParam ? Number(yearParam) : new Date().getFullYear();
    const data = await getHolidays(session.orgId, year);
    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!canManageHolidays(session.user.role)) {
      return err("Only admins can add holidays.", 403);
    }

    const body = await parseBody(req, createHolidaySchema);
    const dup = await rejectDuplicateSubmit("holiday", session.user.id, body);
    if (dup) return dup;
    const holidayDate = formatDateOnly(body.date);

    const conflict = await findHolidayConflict(session.orgId, { name: body.name, date: holidayDate });
    if (conflict) return err(conflict, 409);

    const [holiday] = await db
      .insert(holidays)
      .values({
        orgId: session.orgId,
        // As typed; title-casing turned "QA-TEST <b>" into "Qa-Test" (QA-BUG-18).
        name: body.name,
        date: holidayDate,
        type: body.type ?? "PUBLIC",
        message: body.message,
        isPublic: body.isPublic ?? false,
        isHalfDay: body.isHalfDay ?? false,
      })
      .returning();

    void sendHolidayReminderIfDue(holiday.id).catch(() => {});

    return ok({ success: true, holiday });
  });
}
