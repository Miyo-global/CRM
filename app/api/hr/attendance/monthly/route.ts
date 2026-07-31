import { withAuth, ok, err } from "@/lib/api/helpers";
import { getMonthlyAttendance } from "@/server/queries/hr";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId") || session.user.id;

    const role = session.user.role;
    const isAdmin = role === "CEO" || role === "HR" || role === "ADMIN";
    if (userId !== session.user.id && !isAdmin) {
      return err("Not authorized to view other users' attendance.", 403);
    }

    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    if (yearParam === null || monthParam === null) {
      return err("year and month query params are required.", 400);
    }

    const year = Number(yearParam);
    const month = Number(monthParam);

    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      return err("year and month must be valid numbers.", 400);
    }

    const data = await getMonthlyAttendance(session.orgId, userId, year, month);
    return ok(data);
  });
}
