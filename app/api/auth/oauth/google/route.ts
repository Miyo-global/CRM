import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { accounts, users } from "@/lib/db/schema";
import { and, eq, ne } from "drizzle-orm";

export async function DELETE() {
  return withAuth(async (session) => {
    const existing = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, session.user.id),
        eq(accounts.provider, "google")
      ),
    });

    if (!existing) return err("No Google account linked", 404);

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { password: true },
    });

    if (!user?.password) {
      const otherProvider = await db.query.accounts.findFirst({
        where: and(
          eq(accounts.userId, session.user.id),
          ne(accounts.provider, "google")
        ),
      });

      if (!otherProvider) {
        return err(
          "Set a password before unlinking your only login method",
          400
        );
      }
    }

    await db.delete(accounts).where(
      and(
        eq(accounts.userId, session.user.id),
        eq(accounts.provider, "google")
      )
    );

    return ok({ unlinked: true });
  });
}
