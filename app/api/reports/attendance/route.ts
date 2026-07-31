import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { getAttendanceReport } from "@/server/queries/reports";
import { isAdminOrOwner } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const params = req.nextUrl.searchParams;
      const userId = params.get("userId") ?? undefined;
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

      const isAdmin = isAdminOrOwner(session.user.role);
      if (userId && userId !== session.user.id && !isAdmin) {
        return err("Forbidden", 403);
      }

      const targetUserId = userId || (isAdmin ? undefined : session.user.id);

      const data = await getAttendanceReport(session.orgId, {
        userId: targetUserId,
        startDate,
        endDate,
      });
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load attendance report",
        500
      );
    }
  });
}
