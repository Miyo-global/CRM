"use server";

import { db } from "@/lib/db";
import { users, organizationMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { invalidateUserSession } from "@/lib/auth";
import { requireAuth } from "@/lib/auth/require-auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { ROLES, ADMIN_ROLES } from "@/lib/constants/roles";

export async function resetPassword(password: string) {
  const ctx = await requireAuth();
  if ("error" in ctx) return ctx;
  const session = ctx.session;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }
  if (password.length > 15) {
    return { error: "Password must be at most 15 characters" };
  }
  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!PASSWORD_REGEX.test(password)) {
    return { error: "Password must contain uppercase, lowercase, a number, and a special character (@$!%*?&)" };
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

export async function createEmployee(data: {
    firstName: string;
    lastName: string;
    email: string;
    gender: "MALE" | "FEMALE" | "OTHER";
    role: string;
    initialPassword?: string;
}) {
    const ctx = await requireAuth(ADMIN_ROLES);
    if ("error" in ctx) {
        return { error: "Unauthorized: Insufficient permissions" };
    }
    const session = ctx.session;

    try {
        const existing = await db.query.users.findFirst({
            where: eq(users.email, data.email)
        });
        if (existing) {
            return { error: "Unable to create user. Please check the details and try again." };
        }

        if (!data.initialPassword || data.initialPassword.length < 8) {
            return { error: "A secure initial password (8+ characters) is required" };
        }
        const hashedPassword = await bcrypt.hash(data.initialPassword, 12);

        const creatorOrg = await db.query.organizationMembers.findFirst({
            where: eq(organizationMembers.userId, session.user.id)
        });

        if (!creatorOrg) return { error: "Organization context not found" };

        const newUserId = crypto.randomUUID();

        await db.transaction(async (tx) => {
            await tx.insert(users).values({
                id: newUserId,
                email: data.email,
                password: hashedPassword,
                firstName: data.firstName,
                lastName: data.lastName,
                name: `${data.firstName} ${data.lastName}`,
                role: data.role,
                gender: data.gender,
                isPasswordChangeRequired: true,
                emailVerified: new Date(),
            });

            await tx.insert(organizationMembers).values({
                userId: newUserId,
                orgId: creatorOrg.orgId,
                role: data.role,
            });
        });

        revalidatePath("/hr");
        return { success: true };

    } catch (error) {
        logger.error("Failed to create employee", error);
        return { error: "Failed to create employee" };
    }
}
