import { withAuth, ok } from "@/lib/api/helpers";
import { getHolidaysForCalendar } from "@/server/queries/hr";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const year = Number(searchParams.get("year")) || new Date().getFullYear();
    const month = Number(searchParams.get("month")) || new Date().getMonth() + 1;
    const data = await getHolidaysForCalendar(session.orgId, year, month);
    return ok(data);
  });
}
