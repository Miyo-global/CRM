import { db } from "@/lib/db";
import { holidays } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function getPunchDayBlockReason(
  orgId: string,
  dateStr: string,
): Promise<string | null> {
  const date = new Date(`${dateStr}T12:00:00`);
  if (date.getDay() === 0) {
    return "Regular punch in/out is disabled on Sundays. Submit a Holiday / Sunday work request if you worked.";
  }

  const holiday = await db.query.holidays.findFirst({
    where: and(eq(holidays.orgId, orgId), eq(holidays.date, dateStr)),
    columns: { name: true },
  });

  if (holiday) {
    return `Regular punch in/out is disabled on ${holiday.name ?? "company holidays"}. Submit a Holiday work request if you worked.`;
  }

  return null;
}
