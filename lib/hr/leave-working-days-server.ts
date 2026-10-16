import "server-only";

import { db } from "@/lib/db";
import { holidays } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { countWorkingDays, workingDates } from "@/lib/hr/leave-working-days";

/** Declared holiday dates for an org within a range, as YYYY-MM-DD strings. */
export async function holidayDatesInRange(
  orgId: string,
  startDate: string,
  endDate: string,
): Promise<string[]> {
  const rows = await db
    .select({ date: holidays.date })
    .from(holidays)
    .where(
      and(eq(holidays.orgId, orgId), gte(holidays.date, startDate), lte(holidays.date, endDate)),
    );
  return rows.map((r) => String(r.date).slice(0, 10));
}

/** Working-day count for a leave request, honouring declared holidays (QA-0019). */
export async function countLeaveWorkingDays(input: {
  orgId: string;
  startDate: string;
  endDate: string;
  isHalfDay?: boolean | null;
}): Promise<number> {
  if (input.isHalfDay) return 0.5;
  const orgHolidays = await holidayDatesInRange(input.orgId, input.startDate, input.endDate);
  return countWorkingDays(input.startDate, input.endDate, { holidays: orgHolidays });
}

/** The working dates of a leave request, honouring declared holidays. */
export async function leaveWorkingDates(input: {
  orgId: string;
  startDate: string;
  endDate: string;
}): Promise<string[]> {
  const orgHolidays = await holidayDatesInRange(input.orgId, input.startDate, input.endDate);
  return workingDates(input.startDate, input.endDate, orgHolidays);
}
