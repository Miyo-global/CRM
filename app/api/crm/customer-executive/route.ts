import { withAuth, ok } from "@/lib/api/helpers";
import { getCustomerExecutiveDashboard } from "@/server/queries/crm";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getCustomerExecutiveDashboard(session.orgId!);
    return ok(data);
  });
}
