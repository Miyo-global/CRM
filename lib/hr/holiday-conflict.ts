import "server-only";

import { db } from "@/lib/db";
import { holidays } from "@/lib/db/schema";
import { and, eq, gte, lte, ne, or, sql } from "drizzle-orm";

/**
 * Why a holiday cannot be saved: another one on the same date, or one with
 * the same name (any case) in the same year. Returns the message to show, or
 * null. The UI shows it inside the dialog (QA-BUG-08).
 */
export async function findHolidayConflict(
  orgId: string,
  { name, date }: { name: string; date: string },
  excludeId?: number,
): Promise<string | null> {
  const year = date.slice(0, 4);
  const clash = await db.query.holidays.findFirst({
    where: and(
      eq(holidays.orgId, orgId),
      excludeId ? ne(holidays.id, excludeId) : undefined,
      or(
        eq(holidays.date, date),
        and(
          sql`lower(${holidays.name}) = lower(${name})`,
          gte(holidays.date, `${year}-01-01`),
          lte(holidays.date, `${year}-12-31`),
        ),
      ),
    ),
    columns: { name: true, date: true },
  });
  if (!clash) return null;
  return clash.date === date
    ? `"${clash.name}" is already on this date. Pick another date or edit that holiday.`
    : `"${clash.name}" already exists in ${year} (on ${clash.date}). Use a different name or edit that holiday.`;
}
