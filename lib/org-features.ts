import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface OrgFeatureFlags {
  aiChat: boolean;
  aiLeadScoring: boolean;
  aiEmailDraft: boolean;
  aiSmartNotifications: boolean;
  aiWeeklyRecap: boolean;
}

const DEFAULT_FLAGS: OrgFeatureFlags = {
  aiChat: true,
  aiLeadScoring: true,
  aiEmailDraft: true,
  aiSmartNotifications: true,
  aiWeeklyRecap: true,
};

export function parseOrgFeatureFlags(settings: Record<string, unknown> | null | undefined): OrgFeatureFlags {
  const features = (settings?.features ?? {}) as Partial<OrgFeatureFlags>;
  return {
    aiChat: features.aiChat ?? DEFAULT_FLAGS.aiChat,
    aiLeadScoring: features.aiLeadScoring ?? DEFAULT_FLAGS.aiLeadScoring,
    aiEmailDraft: features.aiEmailDraft ?? DEFAULT_FLAGS.aiEmailDraft,
    aiSmartNotifications: features.aiSmartNotifications ?? DEFAULT_FLAGS.aiSmartNotifications,
    aiWeeklyRecap: features.aiWeeklyRecap ?? DEFAULT_FLAGS.aiWeeklyRecap,
  };
}

export async function getOrgFeatureFlags(orgId: string): Promise<OrgFeatureFlags> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { settings: true },
  });
  return parseOrgFeatureFlags(org?.settings as Record<string, unknown> | null);
}

export async function setOrgFeatureFlag(
  orgId: string,
  flag: keyof OrgFeatureFlags,
  enabled: boolean
): Promise<void> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { settings: true },
  });
  const currentSettings = (org?.settings as Record<string, unknown>) ?? {};
  const currentFeatures = (currentSettings.features ?? {}) as Record<string, unknown>;

  await db
    .update(organizations)
    .set({
      settings: {
        ...currentSettings,
        features: { ...currentFeatures, [flag]: enabled },
      },
    })
    .where(eq(organizations.id, orgId));
}
