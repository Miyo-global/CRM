import { type NextRequest } from "next/server";
import { withAuth, ok, err, toBool, toNumber } from "@/lib/api/helpers";
import { getNotifications } from "@/server/queries/notifications";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    try {
      const params = req.nextUrl.searchParams;
      const unreadOnly = toBool(params.get("unreadOnly")) ?? false;
      const limit = Math.min(Math.max(1, toNumber(params.get("limit")) ?? 20), 100);

      const data = await getNotifications(
        session.user.id,
        session.orgId,
        unreadOnly,
        limit
      );
      return ok(data);
    } catch {
      return err("Failed to load notifications", 500);
    }
  });
}
