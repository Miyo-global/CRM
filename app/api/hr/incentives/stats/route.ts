import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { getIncentiveStats } from "@/server/queries/hr";

export async function GET() {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("You do not have permission to view incentive stats.", 403);
    }
    const data = await getIncentiveStats(session.orgId);
    return ok(data);
  });
}
