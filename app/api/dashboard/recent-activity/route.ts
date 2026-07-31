import { withAuth, ok, err } from "@/lib/api/helpers";
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
      return err(
        error instanceof Error ? error.message : "Failed to load recent activity",
        500
      );
    }
  });
}
