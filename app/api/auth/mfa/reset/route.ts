import { type NextRequest } from "next/server";
import { withAdmin, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, mfaBackupCodes, organizationMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { invalidateUserSession } from "@/lib/auth";

const schema = z.object({ userId: z.string().min(1) });

export async function POST(req: NextRequest) {
  return withAdmin(async (session) => {
    const body = await parseBody(req, schema);

    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, body.userId),
        eq(organizationMembers.orgId, session.orgId)
      ),
      columns: { id: true },
    });
    if (!membership) return err("User not found", 404);

    const user = await db.query.users.findFirst({
      where: eq(users.id, body.userId),
      columns: { id: true },
    });
    if (!user) return err("User not found", 404);

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ totpEnabled: false, totpSecret: null })
        .where(eq(users.id, body.userId));

      await tx.delete(mfaBackupCodes).where(eq(mfaBackupCodes.userId, body.userId));
    });

    await invalidateUserSession(body.userId);

    return ok({ reset: true });
  });
}
