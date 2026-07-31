import { withAuth, ok, err } from "@/lib/api/helpers";
import { getRoleStats } from "@/server/queries/dashboard";
import { logger } from "@/lib/logger";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const stats = await getRoleStats(session.orgId, session.user.id);
      return ok(stats);
    } catch (error) {
      logger.error("Failed", error);
      return err("Failed", 500);
    }
  });
}
