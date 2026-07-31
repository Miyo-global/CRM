import { withAuth, ok, err } from "@/lib/api/helpers";
import { getExecutiveDashboard } from "@/server/queries/dashboard";
import { cached, CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import { logger } from "@/lib/logger";

export async function GET() {
  return withAuth(async (session) => {
    const role = session.user.role;
    if (role !== "CEO" && role !== "HR" && role !== "ADMIN") {
      return err("Forbidden", 403);
    }
    try {
      const data = await cached(
        CACHE_KEYS.executiveDashboard(session.orgId),
        () => getExecutiveDashboard(session.orgId),
        { ttlSeconds: CACHE_TTL.MEDIUM }
      );
      return ok(data);
    } catch (error) {
      logger.error("Failed to load executive dashboard", error);
      return err("Failed to load executive dashboard", 500);
    }
  });
}
