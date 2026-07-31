import { withAuth, ok } from "@/lib/api/helpers";
import { getSalesDashboard } from "@/server/queries/crm";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getSalesDashboard(session.orgId!);
    return ok(data);
  });
}
