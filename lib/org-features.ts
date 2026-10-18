import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface OrgFeatureFlags {
  aiChat: boolean;
  aiLeadScoring: boolean;
  aiEmailDraft: boolean;
  aiSmartNotifications: boolean;
  aiWeeklyRecap: boolean;
  clientPortal: boolean;
  /** KB-0007: the Knowledge module as a whole. Off makes /api/knowledge/* 404. */
  knowledgeBase: boolean;
  /** Ask, page AI and briefs. Only effective when an AI key is configured. */
  knowledgeAi: boolean;
  /** Public share links for wiki pages. */
  knowledgePublicSharing: boolean;
  /** Public help centre (D5). Off by default. */
  knowledgeHelpCentre: boolean;
}

const DEFAULT_FLAGS: OrgFeatureFlags = {
  aiChat: true,
  aiLeadScoring: true,
  aiEmailDraft: true,
  aiSmartNotifications: true,
  aiWeeklyRecap: true,
  clientPortal: false,
  knowledgeBase: true,
  knowledgeAi: true,
  knowledgePublicSharing: true,
  knowledgeHelpCentre: false,
};

export function parseOrgFeatureFlags(settings: Record<string, unknown> | null | undefined): OrgFeatureFlags {
  const features = (settings?.features ?? {}) as Partial<OrgFeatureFlags>;
  return {
    aiChat: features.aiChat ?? DEFAULT_FLAGS.aiChat,
    aiLeadScoring: features.aiLeadScoring ?? DEFAULT_FLAGS.aiLeadScoring,
    aiEmailDraft: features.aiEmailDraft ?? DEFAULT_FLAGS.aiEmailDraft,
    aiSmartNotifications: features.aiSmartNotifications ?? DEFAULT_FLAGS.aiSmartNotifications,
    aiWeeklyRecap: features.aiWeeklyRecap ?? DEFAULT_FLAGS.aiWeeklyRecap,
    clientPortal: features.clientPortal ?? DEFAULT_FLAGS.clientPortal,
    knowledgeBase: features.knowledgeBase ?? DEFAULT_FLAGS.knowledgeBase,
    knowledgeAi: features.knowledgeAi ?? DEFAULT_FLAGS.knowledgeAi,
    knowledgePublicSharing:
      features.knowledgePublicSharing ?? DEFAULT_FLAGS.knowledgePublicSharing,
    knowledgeHelpCentre: features.knowledgeHelpCentre ?? DEFAULT_FLAGS.knowledgeHelpCentre,
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
