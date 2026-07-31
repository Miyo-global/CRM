import { type NextRequest } from "next/server";
import { withAuth, ok, err, toNumber } from "@/lib/api/helpers";
import { getProjectReport } from "@/server/queries/reports";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const params = req.nextUrl.searchParams;
      const projectId = toNumber(params.get("projectId"));
      const startDateStr = params.get("startDate");
      const endDateStr = params.get("endDate");

      const startDate = startDateStr ? new Date(startDateStr) : undefined;
      const endDate = endDateStr ? new Date(endDateStr) : undefined;

      const data = await getProjectReport(session.orgId, {
        projectId,
        startDate,
        endDate,
      });
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load project report",
        500
      );
    }
  });
}
