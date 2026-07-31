import { withAuth, ok } from "@/lib/api/helpers";
import { getOrgChart } from "@/server/queries/hr";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getOrgChart(session.orgId);
    return ok(data);
  });
}
