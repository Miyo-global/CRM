import { withAuth, ok, err } from "@/lib/api/helpers";
import { getTeamAvailability } from "@/server/queries/dashboard";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await getTeamAvailability(session.orgId);
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load team availability",
        500
      );
    }
  });
}
