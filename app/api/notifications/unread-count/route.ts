import { withAuth, ok, err } from "@/lib/api/helpers";
import { getUnreadCount } from "@/server/queries/notifications";

export async function GET() {
  return withAuth(async (session) => {
    try {
      const data = await getUnreadCount(session.user.id, session.orgId);
      return ok(data);
    } catch {
      return err("Failed to load unread count", 500);
    }
  });
}
