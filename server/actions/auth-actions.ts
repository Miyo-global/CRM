"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { invalidateUserSession } from "@/lib/auth";
import { requireAuth } from "@/lib/auth/require-auth";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logger";
import { PASSWORD_RULES, validatePasswordStrength } from "@/lib/utils/password-validation";

export async function resetPassword(password: string) {
  const ctx = await requireAuth();
  if ("error" in ctx) return ctx;
  const session = ctx.session;

  const strength = validatePasswordStrength(password ?? "");
  if (!strength.valid || (password ?? "").length > PASSWORD_RULES.maxLength) {
    return { error: strength.missing[0] ?? `Password must be at most ${PASSWORD_RULES.maxLength} characters` };
  }

  try {
     const hashedPassword = await bcrypt.hash(password, 12);

     await db.update(users)
        .set({
           password: hashedPassword,
           isPasswordChangeRequired: false,
        })
        .where(eq(users.id, session.user.id));

     await invalidateUserSession(session.user.id);

     return { success: true };
  } catch (error) {
      logger.error("Failed to reset password", error);
      return { error: "Failed to reset password" };
  }
}
