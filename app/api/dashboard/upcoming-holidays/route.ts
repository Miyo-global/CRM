import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { holidays } from "@/lib/db/schema";
import { eq, and, gte, asc } from "drizzle-orm";
import { format } from "date-fns";

export async function GET() {
  return withAuth(async (session) => {
    const today = format(new Date(), "yyyy-MM-dd");

    const data = await db
      .select({
        id: holidays.id,
        name: holidays.name,
        date: holidays.date,
        message: holidays.message,
      })
      .from(holidays)
      .where(
        and(
          eq(holidays.orgId, session.orgId),
          gte(holidays.date, today)
        )
      )
      .orderBy(asc(holidays.date))
      .limit(3);

    return ok(data);
  });
}
