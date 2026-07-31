"server-only";

import { db } from "@/lib/db";
import { holidays } from "@/lib/db/schema";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import type { Holiday } from "@/types/hr";

export async function getHolidays(orgId: string, year: number): Promise<Holiday[]> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  return db.query.holidays.findMany({
    where: and(
      eq(holidays.orgId, orgId),
      gte(holidays.date, startDate),
      lte(holidays.date, endDate)
    ),
    orderBy: [asc(holidays.date)],
  }) as unknown as Promise<Holiday[]>;
}

export async function getHolidaysForCalendar(
  orgId: string,
  year: number,
  month: number
): Promise<Holiday[]> {
  const mm = String(month).padStart(2, "0");
  const startDate = `${year}-${mm}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

  return db.query.holidays.findMany({
    where: and(
      eq(holidays.orgId, orgId),
      gte(holidays.date, startDate),
      lte(holidays.date, endDate)
    ),
    orderBy: [asc(holidays.date)],
  }) as unknown as Promise<Holiday[]>;
}
