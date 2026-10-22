import { type NextRequest } from "next/server";
import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { logger } from "@/lib/logger";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sendPasswordChangeConfirmationEmail } from "@/lib/email";
import { revokeAllUserSessions } from "@/lib/auth";
import { hashToken } from "@/lib/secret-crypto";
import { PASSWORD_ZOD_SCHEMA } from "@/lib/utils/password-validation";
import { afterResponse } from "@/lib/after-response";

const schema = z.object({
  token: z.string(),
  // One policy, shared with the client, instead of an inline 8-character rule
  // over a narrow character set (QA-0067).
  password: PASSWORD_ZOD_SCHEMA,
});

export async function POST(req: NextRequest) {
  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await req.json());
  } catch (error) {
    // A weak password used to return the same opaque message as a bad token
    // (QA-0067).
    if (error instanceof z.ZodError) {
      const passwordIssue = error.issues.find((issue) => issue.path[0] === "password");
      if (passwordIssue) {
        return err(passwordIssue.message, 400);
      }
    }
    return err("Invalid request body", 400);
  }

  const tokenRecord = await db.query.passwordResetTokens.findFirst({
    where: and(
      eq(passwordResetTokens.token, hashToken(input.token)),
      gt(passwordResetTokens.expiresAt, new Date())
    ),
  });

  if (!tokenRecord) return err("Invalid or expired reset token", 400);

  const hashedPassword = await bcrypt.hash(input.password, 12);

  const updatedUser = await db.transaction(async (tx) => {
    const result = await tx
      .update(users)
      .set({
        password: hashedPassword,
        isPasswordChangeRequired: false,
        emailVerified: new Date(),
      })
      .where(eq(users.email, tokenRecord.email))
      .returning({ id: users.id });

    await tx
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.email, tokenRecord.email));

    return result;
  });

  if (updatedUser[0]?.id) {
    await revokeAllUserSessions(updatedUser[0].id);
  }

  logger.info("Auth: password reset completed", { email: tokenRecord.email });

  const user = await db.query.users.findFirst({
    where: eq(users.email, tokenRecord.email),
    columns: { name: true },
  });
  afterResponse("auth/reset-password", () => sendPasswordChangeConfirmationEmail(
    tokenRecord.email,
    user?.name ?? "User"
  ));

  return ok({ success: true });
}
