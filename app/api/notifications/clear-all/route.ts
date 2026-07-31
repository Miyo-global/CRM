import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE() {
  return withAuth(async (session) => {
    await db
      .delete(notifications)
      .where(and(eq(notifications.orgId, session.orgId), eq(notifications.userId, session.user.id)));
    return ok({ success: true });
  });
}
