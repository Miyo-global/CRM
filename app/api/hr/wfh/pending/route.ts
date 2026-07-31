import { withAuth, ok, err } from "@/lib/api/helpers";
import { getPendingWfhRequests } from "@/server/queries/hr";
import { isAdminOrOwner } from "@/lib/auth/helpers";

export async function GET() {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only HR or leadership can view pending WFH requests.", 403);
    }

    const data = await getPendingWfhRequests(session.orgId);
    return ok(data);
  });
}
