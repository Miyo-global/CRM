import { withAuth, ok } from "@/lib/api/helpers";
import { getSupportDashboard } from "@/server/queries/crm";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getSupportDashboard(session.orgId!);
    return ok(data);
  });
}
