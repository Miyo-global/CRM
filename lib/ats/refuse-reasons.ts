import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { atsRefuseReasons } from "@/lib/db/schema";

/**
 * MIYO-0653: why people are turned down. "Withdrew" has no template, so
 * choosing it sends nothing — the candidate told us, not the other way round.
 */
export const DEFAULT_REFUSE_REASONS: { name: string; emailTemplateId: string | null }[] = [
  { name: "Not qualified", emailTemplateId: "ats-application-rejected" },
  { name: "Position filled", emailTemplateId: "ats-application-rejected" },
  { name: "Salary mismatch", emailTemplateId: "ats-application-rejected" },
  { name: "Withdrew", emailTemplateId: null },
  { name: "No show", emailTemplateId: null },
];

export async function refuseReasons(orgId: string) {
  const existing = await db
    .select()
    .from(atsRefuseReasons)
    .where(and(eq(atsRefuseReasons.orgId, orgId), eq(atsRefuseReasons.active, true)))
    .orderBy(asc(atsRefuseReasons.id));
  if (existing.length > 0) return existing;

  await db
    .insert(atsRefuseReasons)
    .values(DEFAULT_REFUSE_REASONS.map((reason) => ({ ...reason, orgId })))
    .onConflictDoNothing();

  return db
    .select()
    .from(atsRefuseReasons)
    .where(and(eq(atsRefuseReasons.orgId, orgId), eq(atsRefuseReasons.active, true)))
    .orderBy(asc(atsRefuseReasons.id));
}
