import { withAuth, ok } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  return withAuth(async (session) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { totpEnabled: true },
    });
    return ok({ enabled: user?.totpEnabled ?? false });
  });
}
