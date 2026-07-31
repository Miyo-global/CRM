import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { getIncentiveConfigHistory } from "@/server/queries/hr/incentives";
import { logger } from "@/lib/logger";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("You do not have permission to view incentive rate history.", 403);
    }

    const pageParam = Number(req.nextUrl.searchParams.get("page"));
    const limitParam = Number(req.nextUrl.searchParams.get("limit"));
    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
    const limit =
      Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), 50) : 10;

    try {
      const data = await getIncentiveConfigHistory(session.orgId, page, limit);
      return ok(data);
    } catch (e) {
      logger.error("getIncentiveConfigHistory failed", { error: e, orgId: session.orgId });
      return err("Could not load incentive rate history.", 500);
    }
  });
}
