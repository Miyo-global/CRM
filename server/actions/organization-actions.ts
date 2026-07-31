"use server";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { organizations, organizationMembers } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { invalidateUserSession } from "@/lib/auth";

export interface CreateOrganizationResult {
  success?: boolean;
  error?: string;
  orgId?: string;
  slug?: string;
}
export async function createOrganization(formData: FormData): Promise<CreateOrganizationResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const name = formData.get("name") as string;
  const slug = formData.get("slug") as string;

  if (!name || name.trim().length < 2) {
    return { error: "Organization name must be at least 2 characters" };
  }

  if (!slug || slug.trim().length < 2) {
    return { error: "Organization slug must be at least 2 characters" };
  }
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(slug)) {
    return { error: "Slug must be lowercase letters, numbers, and hyphens only" };
  }

  try {
    const existing = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    });

    if (existing) {
      return { error: "This organization slug is already taken" };
    }

    const orgId = nanoid();
    await db.insert(organizations).values({
      id: orgId,
      name: name.trim(),
      slug: slug.trim(),
    });
    await db.insert(organizationMembers).values({
      userId: session.user.id,
      orgId,
      role: "CEO",
    });

    await invalidateUserSession(session.user.id);
    revalidatePath("/dashboard");
    revalidatePath("/settings/organization");

    return { success: true, orgId, slug };
  } catch (error) {
    logger.error("Failed to create organization", error);
    return { error: "Failed to create organization. Please try again." };
  }
}

export async function checkUserHasOrganization(): Promise<{ hasOrg: boolean; orgSlug?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { hasOrg: false };
  }

  const membership = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!membership) {
    return { hasOrg: false };
  }

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, membership.orgId),
  });

  return { hasOrg: true, orgSlug: org?.slug };
}
