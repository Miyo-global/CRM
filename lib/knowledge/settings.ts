/**
 * KB-0034: per-org KB settings.
 *
 * The row is created on first read rather than at org creation, so an org that
 * never opens the Knowledge module grows no rows. The three HR flags nest
 * (search needs the link, AI needs search), and that rule is enforced by a
 * check constraint as well as here — the constraint is what catches a path
 * that forgets to ask.
 */
import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { kbSettings } from "@/lib/db/schema";

export interface KbSettingsRow {
  trashRetentionDays: number;
  chatHistoryRetentionDays: number | null;
  hrmsKbLinkEnabled: boolean;
  hrmsKbSearchEnabled: boolean;
  hrmsKbAiEnabled: boolean;
}

export const KB_SETTINGS_DEFAULTS: KbSettingsRow = {
  trashRetentionDays: 30,
  chatHistoryRetentionDays: 90,
  hrmsKbLinkEnabled: false,
  hrmsKbSearchEnabled: false,
  hrmsKbAiEnabled: false,
};

export async function getKbSettings(orgId: string): Promise<KbSettingsRow> {
  const existing = await db.query.kbSettings.findFirst({
    where: eq(kbSettings.orgId, orgId),
    columns: {
      trashRetentionDays: true,
      chatHistoryRetentionDays: true,
      hrmsKbLinkEnabled: true,
      hrmsKbSearchEnabled: true,
      hrmsKbAiEnabled: true,
    },
  });
  if (existing) return existing;

  const [created] = await db
    .insert(kbSettings)
    .values({ orgId })
    .onConflictDoNothing()
    .returning({
      trashRetentionDays: kbSettings.trashRetentionDays,
      chatHistoryRetentionDays: kbSettings.chatHistoryRetentionDays,
      hrmsKbLinkEnabled: kbSettings.hrmsKbLinkEnabled,
      hrmsKbSearchEnabled: kbSettings.hrmsKbSearchEnabled,
      hrmsKbAiEnabled: kbSettings.hrmsKbAiEnabled,
    });

  // Lost the race with another first read: either row is the same row.
  return created ?? KB_SETTINGS_DEFAULTS;
}

/**
 * Pure: the nesting rule. Turning the link off takes search and AI with it,
 * rather than leaving a state the check constraint would refuse.
 */
export function applyHrFlagNesting(
  current: KbSettingsRow,
  patch: Partial<KbSettingsRow>,
): KbSettingsRow {
  const next = { ...current, ...patch };
  if (!next.hrmsKbLinkEnabled) {
    next.hrmsKbSearchEnabled = false;
    next.hrmsKbAiEnabled = false;
  }
  if (!next.hrmsKbSearchEnabled) next.hrmsKbAiEnabled = false;
  return next;
}

export async function updateKbSettings(
  orgId: string,
  patch: Partial<KbSettingsRow>,
): Promise<KbSettingsRow> {
  const current = await getKbSettings(orgId);
  const next = applyHrFlagNesting(current, patch);

  await db
    .update(kbSettings)
    .set({ ...next, updatedAt: new Date() })
    .where(eq(kbSettings.orgId, orgId));

  return next;
}
