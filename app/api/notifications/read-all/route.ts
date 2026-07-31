import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH() {
  return withAuth(async (session) => {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.orgId, session.orgId),
            eq(notifications.userId, session.user.id),
            eq(notifications.isRead, false)
          )
        );

      return ok({ success: true });
    } catch {
      return err("Failed to mark all notifications as read", 500);
    }
  });
}
