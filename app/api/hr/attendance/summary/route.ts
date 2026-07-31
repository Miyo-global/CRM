import { withAuth, ok, err } from "@/lib/api/helpers";
import { getAttendanceSummaryWithLogs } from "@/server/queries/hr";
import type { AttendanceSummaryPeriod } from "@/types/hr";
import type { NextRequest } from "next/server";

const PERIODS = new Set<AttendanceSummaryPeriod>(["month", "quarter", "year"]);

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId") ?? session.user.id;
    const role = session.user.role;
    const isAdmin = role === "CEO" || role === "HR" || role === "ADMIN";
    if (userId !== session.user.id && !isAdmin) {
      return err("Not authorized to view other users' attendance.", 403);
    }

    const periodRaw = searchParams.get("period");
    const period = periodRaw as AttendanceSummaryPeriod;
    if (!periodRaw || !PERIODS.has(period)) {
      return err("period must be month, quarter, or year.", 400);
    }

    const yearParam = searchParams.get("year");
    if (yearParam === null) {
      return err("year query param is required.", 400);
    }
    const year = Number(yearParam);
    if (!Number.isFinite(year)) {
      return err("year must be a valid number.", 400);
    }

    const monthParam = searchParams.get("month");
    const quarterParam = searchParams.get("quarter");

    if (period === "month" && monthParam === null) {
      return err("month query param is required when period=month (0–11).", 400);
    }
    if (period === "quarter" && quarterParam === null) {
      return err("quarter query param is required when period=quarter (1–4).", 400);
    }

    const month0 = monthParam !== null ? Number(monthParam) : undefined;
    const quarter1 = quarterParam !== null ? Number(quarterParam) : undefined;

    if (
      period === "month" &&
      (month0 === undefined || !Number.isFinite(month0) || month0 < 0 || month0 > 11)
    ) {
      return err("month must be 0–11.", 400);
    }
    if (
      period === "quarter" &&
      (quarter1 === undefined || !Number.isFinite(quarter1) || quarter1 < 1 || quarter1 > 4)
    ) {
      return err("quarter must be 1–4.", 400);
    }

    const data = await getAttendanceSummaryWithLogs(
      session.orgId,
      userId,
      period,
      year,
      period === "month" ? month0 : undefined,
      period === "quarter" ? quarter1 : undefined,
    );
    return ok(data);
  });
}
