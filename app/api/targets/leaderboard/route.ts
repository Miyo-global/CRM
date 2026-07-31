import { type NextRequest } from "next/server";
import { withAuth, ok } from "@/lib/api/helpers";
import { getTargetLeaderboard } from "@/server/queries/crm";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const metricType = req.nextUrl.searchParams.get("metricType") ?? undefined;
    const data = await getTargetLeaderboard(session.orgId!, metricType);
    return ok(data);
  });
}
