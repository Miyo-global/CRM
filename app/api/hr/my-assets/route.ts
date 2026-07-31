import { withAuth, ok } from "@/lib/api/helpers";
import { getMyAssignedAssets } from "@/server/queries/hr/assets";

export async function GET() {
  return withAuth(async (session) => {
    const data = await getMyAssignedAssets(session.orgId, session.user.id);
    return ok(data);
  });
}
