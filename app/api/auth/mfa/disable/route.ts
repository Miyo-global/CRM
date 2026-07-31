import { type NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { verifyTotpToken } from "@/lib/totp";
import { decryptSecret } from "@/lib/secret-crypto";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { invalidateUserSession } from "@/lib/auth";

const schema = z.object({ token: z.string().length(6) });

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    let body: z.infer<typeof schema>;
    try {
      const json = await req.json();
      body = schema.parse(json);
    } catch {
      return err("Invalid request", 400);
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
    if (!user?.totpEnabled || !user.totpSecret) return err("MFA not enabled", 400);

    const valid = verifyTotpToken(body.token, decryptSecret(user.totpSecret));
    if (!valid) return err("Invalid token", 400);

    await db.update(users).set({ totpEnabled: false, totpSecret: null }).where(eq(users.id, session.user.id));
    await invalidateUserSession(session.user.id);

    return ok({ disabled: true });
  });
}
