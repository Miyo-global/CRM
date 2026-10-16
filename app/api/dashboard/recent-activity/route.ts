import { withAuth, ok, serverError } from "@/lib/api/helpers";
import { getRecentActivity } from "@/server/queries/dashboard";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await getRecentActivity(
        session.orgId,
        session.user.id,
        session.user.role
      );
      return ok(data);
    } catch (error) {
      return serverError(error, { route: "dashboard/recent-activity", orgId: session.orgId }, "Could not load recent activity.");
    }
  });
}
