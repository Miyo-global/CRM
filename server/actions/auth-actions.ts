"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { invalidateUserSession } from "@/lib/auth";
import { requireAuth } from "@/lib/auth/require-auth";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logger";
import { passwordIssue } from "@/lib/utils/password-validation";

export async function resetPassword(password: string) {
  const ctx = await requireAuth();
  if ("error" in ctx) return ctx;
  const session = ctx.session;

  const me = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { email: true, firstName: true, lastName: true, name: true },
  });
  const issue = passwordIssue(password ?? "", me ?? {});
  if (issue) return { error: issue };

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
