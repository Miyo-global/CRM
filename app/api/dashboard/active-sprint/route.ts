import { withAuth, ok, serverError } from "@/lib/api/helpers";
import { getActiveSprintSummary } from "@/server/queries/dashboard";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await getActiveSprintSummary(
        session.orgId,
        session.user.id,
        session.user.role
      );
      return ok(data);
    } catch (error) {
      return serverError(error, { route: "dashboard/active-sprint", orgId: session.orgId }, "Could not load the active sprint.");
    }
  });
}
