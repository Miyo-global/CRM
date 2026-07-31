import { type NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendVerificationEmail } from "@/lib/email";
import { hashToken } from "@/lib/secret-crypto";
import { nanoid } from "nanoid";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  let email: string;
  try {
    ({ email } = schema.parse(await req.json()));
  } catch {
    return err("Invalid request body", 400);
  }

  email = email.toLowerCase().trim();

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user || user.emailVerified) return ok({ success: true });

  const verificationToken = nanoid(32);
  const expires = new Date();
  expires.setHours(expires.getHours() + 24);

  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.identifier, email));

  await db.insert(verificationTokens).values({
    identifier: email,
    token: hashToken(verificationToken),
    expires,
  });

  await sendVerificationEmail(email, verificationToken);

  return ok({ success: true });
}
