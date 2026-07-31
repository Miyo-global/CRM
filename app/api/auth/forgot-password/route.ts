import { type NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { sql, eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { sendPasswordResetEmail } from "@/lib/email";
import { hashToken } from "@/lib/secret-crypto";
import { nanoid } from "nanoid";
import { z } from "zod";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  let email: string;
  try {
    const body = await req.json();
    ({ email } = schema.parse(body));
  } catch {
    return err("Invalid request body", 400);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await db.query.users.findFirst({
    where: sql`lower(${users.email}) = ${normalizedEmail}`,
  });

  if (!user) {
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
    return ok({ success: true });
  }

  const resetToken = nanoid(32);
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.email, normalizedEmail));

  await db.insert(passwordResetTokens).values({
    id: nanoid(),
    email: normalizedEmail,
    token: hashToken(resetToken),
    expiresAt,
  });

  logger.info("Auth: password reset requested", { email });

  sendPasswordResetEmail(email, resetToken).catch((e) => {
    logger.error("Failed to send password reset email", { error: e instanceof Error ? e.message : "Unknown", email });
  });

  return ok({ success: true });
}
