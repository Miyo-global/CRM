import { withAuth, ok, serverError } from "@/lib/api/helpers";
import { getRecentProjects } from "@/server/queries/dashboard";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await getRecentProjects(
        session.orgId,
        session.user.id,
        session.user.role
      );
      return ok(data);
    } catch (error) {
      return serverError(error, { route: "dashboard/recent-projects", orgId: session.orgId }, "Could not load recent projects.");
    }
  });
}
