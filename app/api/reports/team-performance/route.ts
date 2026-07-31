import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { getTeamPerformanceReport } from "@/server/queries/reports";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      if (!isAdminOrOwner(session.user.role)) {
        return err("Forbidden", 403);
      }

      const params = req.nextUrl.searchParams;
      const startDateStr = params.get("startDate");
      const endDateStr = params.get("endDate");

      if (!startDateStr || !endDateStr) {
        return err("startDate and endDate are required", 400);
      }

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return err("Invalid date format", 400);
      }

      const data = await getTeamPerformanceReport(session.orgId, {
        startDate,
        endDate,
      });
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load team performance report",
        500
      );
    }
  });
}
