import { withAuth, ok, serverError } from "@/lib/api/helpers";
import { getTeamAvailability } from "@/server/queries/dashboard";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await getTeamAvailability(session.orgId);
      return ok(data);
    } catch (error) {
      return serverError(error, { route: "dashboard/team-availability", orgId: session.orgId }, "Could not load team availability.");
    }
  });
}
