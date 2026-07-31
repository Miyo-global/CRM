import "server-only";

import { db } from "@/lib/db";
import { organizationMembers, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import type { AuthResult } from "@/lib/auth/types";
import { ADMIN_ROLES } from "@/lib/constants/roles";
import { logger } from "@/lib/logger";

export { isAdminOrOwner, isCEO, isExpenseAdmin } from "./role-guards";

export async function ensureOrgMembership(
  userId: string,
  role?: string
): Promise<{ orgId: string; role: string } | null> {

  const existing = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, userId),
  });

  if (existing) {
    return { orgId: existing.orgId, role: existing.role };
  }

  const org = await db.query.organizations.findFirst();
  if (!org) return null;

  const memberRole = role || "ENGINEERING";

  try {
    await db
      .insert(organizationMembers)
      .values({
        userId,
        orgId: org.id,
        role: memberRole,
      })
      .onConflictDoNothing();
  } catch (e) {
    logger.error("ensureOrgMembership: failed to create organization membership", { userId, orgId: org.id, error: e });
    return null;
  }

  return { orgId: org.id, role: memberRole };
}

export async function getAuthenticatedMember(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const membership = await ensureOrgMembership(
    session.user.id,
    session.user.role
  );

  if (!membership) {
    return { error: "Unauthorized" };
  }

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) {
    return { error: "Unauthorized" };
  }

  return {
    session,
    member,
    isAdmin: ADMIN_ROLES.includes(member.role),
    userId: session.user.id,
    orgId: member.orgId,
  };
}
