import { withAuth, ok, err } from "@/lib/api/helpers";
import { getTodayActivities } from "@/server/queries/dashboard";
import { logger } from "@/lib/logger";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const activities = await getTodayActivities(session.orgId);
      return ok(activities);
    } catch (error) {
      logger.error("Failed", error);
      return err("Failed", 500);
    }
  });
}
