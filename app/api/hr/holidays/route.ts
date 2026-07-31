import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { getHolidays } from "@/server/queries/hr";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { holidays } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { formatDateOnly, getTodayString } from "@/lib/date-utils";
import type { NextRequest } from "next/server";
import { createHolidaySchema } from "@/lib/validations/holidays";
import { sendHolidayReminderIfDue } from "@/server/actions/holiday-actions";

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
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can add holidays.", 403);
    }

    const body = await parseBody(req, createHolidaySchema);
    const holidayDate = formatDateOnly(body.date);

    const duplicate = await db.query.holidays.findFirst({
      where: and(eq(holidays.orgId, session.orgId), eq(holidays.date, holidayDate)),
    });
    if (duplicate) {
      return err("A holiday already exists on this date.", 409);
    }

    const [holiday] = await db
      .insert(holidays)
      .values({
        orgId: session.orgId,
        name: body.name.replace(/\b\w/g, (char) => char.toUpperCase()),
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
