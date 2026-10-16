import { withAuth, ok, serverError } from "@/lib/api/helpers";
import { getDashboardStats } from "@/server/queries/dashboard";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await getDashboardStats(session.orgId, session.user.id);
      return ok(data);
    } catch (error) {
      return serverError(error, { route: "dashboard/stats", orgId: session.orgId }, "Could not load dashboard stats.");
    }
  });
}
