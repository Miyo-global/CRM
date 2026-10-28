import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { PASSWORD_ZOD_SCHEMA, passwordIdentityIssue } from "@/lib/utils/password-validation";
import { revokeAllUserSessions } from "@/lib/auth";
import type { NextRequest } from "next/server";
import { afterResponse } from "@/lib/after-response";
import { completeAccountActivationTasks } from "@/lib/hr/onboarding-auto-complete";

const schema = z.object({
  password: PASSWORD_ZOD_SCHEMA,
});

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    const body = await req.json() as unknown;
    const parsed = schema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);

    const me = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { email: true, firstName: true, lastName: true, name: true },
    });
    const identityIssue = passwordIdentityIssue(parsed.data.password, me ?? {});
    if (identityIssue) return err(identityIssue, 400);

    const hashed = await bcrypt.hash(parsed.data.password, 12);

    await db
      .update(users)
      .set({
        password: hashed,
        isPasswordChangeRequired: false,
        passwordChangedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    await revokeAllUserSessions(session.user.id, { exceptSessionId: session.sessionId });
    // Forced first password set: the account is live, tick the checklist's activation item(s).
    const userId = session.user.id;
    afterResponse("auth/setup-password:onboarding", () => completeAccountActivationTasks(userId));

    return ok({ success: true });
  });
}
