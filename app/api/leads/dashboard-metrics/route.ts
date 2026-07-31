import { withAuth, ok } from "@/lib/api/helpers";
import { getDashboardMetrics } from "@/server/queries/leads";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getDashboardMetrics(session.orgId!);
    return ok(data);
  });
}
