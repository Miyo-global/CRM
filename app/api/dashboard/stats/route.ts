import { withAuth, ok, err } from "@/lib/api/helpers";
import { getDashboardStats } from "@/server/queries/dashboard";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await getDashboardStats(session.orgId, session.user.id);
      return ok(data);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load dashboard stats",
        500
      );
    }
  });
}
