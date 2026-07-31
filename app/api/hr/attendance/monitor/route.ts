import { withAuth, ok, err } from "@/lib/api/helpers";
import { getAttendanceMonitor } from "@/server/queries/hr";
import { getTodayString } from "@/lib/date-utils";
import type { NextRequest } from "next/server";

const ALLOWED_ROLES = new Set(["CEO", "ADMIN", "HR", "BRANCH_MANAGER", "BRANCH_HR"]);

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    if (!ALLOWED_ROLES.has(session.user.role ?? "")) {
      return err("Not authorized", 403);
    }
    const { searchParams } = req.nextUrl;
    const date = searchParams.get("date") ?? getTodayString();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return err("Invalid date", 400);
    const data = await getAttendanceMonitor(session.orgId, date);
    return ok(data);
  });
}
