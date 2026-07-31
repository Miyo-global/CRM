import { withAuth, ok, err } from "@/lib/api/helpers";
import { getAttendanceLogs } from "@/server/queries/hr";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId") ?? session.user.id;
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    const startDateArg = startDate && dateRe.test(startDate) ? startDate : undefined;
    const endDateArg = endDate && dateRe.test(endDate) ? endDate : undefined;
    if (startDateArg && endDateArg && startDateArg > endDateArg) {
      return err("Start date must be on or before end date", 400);
    }

    const role = session.user.role;
    const isAdmin = role === "CEO" || role === "HR" || role === "ADMIN" || role === "BRANCH_MANAGER" || role === "BRANCH_HR";
    if (userId !== session.user.id && !isAdmin) {
      return err("Not authorized to view other users' logs.", 403);
    }

    const parsedYear = year !== null ? Number(year) : undefined;
    const parsedMonth = month !== null ? Number(month) : undefined;
    const yearArg =
      parsedYear !== undefined &&
      Number.isInteger(parsedYear) &&
      parsedYear >= 1970 &&
      parsedYear <= 9999
        ? parsedYear
        : undefined;
    const monthArg =
      parsedMonth !== undefined &&
      Number.isInteger(parsedMonth) &&
      parsedMonth >= 1 &&
      parsedMonth <= 12
        ? parsedMonth
        : undefined;

    const data = await getAttendanceLogs(
      session.orgId,
      userId,
      yearArg,
      monthArg,
      startDateArg,
      endDateArg,
    );
    return ok(data);
  });
}
