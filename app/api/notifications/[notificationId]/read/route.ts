import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  return withAuth(async (session) => {
    try {
      const { notificationId: id } = await params;
      const notifId = Number(id);
      if (!Number.isFinite(notifId)) return err("Invalid ID", 400);

      const updated = await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.id, notifId),
            eq(notifications.userId, session.user.id),
            eq(notifications.orgId, session.orgId)
          )
        )
        .returning({ id: notifications.id });

      if (updated.length === 0) return err("Notification not found", 404);

      return ok({ success: true });
    } catch {
      return err("Failed to mark notification as read", 500);
    }
  });
}
