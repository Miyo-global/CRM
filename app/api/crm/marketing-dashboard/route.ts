import { withAuth, ok } from "@/lib/api/helpers";
import { getMarketingDashboard } from "@/server/queries/crm";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getMarketingDashboard(session.orgId!);
    return ok(data);
  });
}
