import "server-only";

import { and, eq, isNotNull, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { atsConsents, candidateApplications, candidates } from "@/lib/db/schema";
import { createAuditLog } from "@/lib/audit-log";
import { deleteFile } from "@/lib/storage";
import { logger } from "@/lib/logger";

/** MIYO-0679: how long a rejected candidate's details are kept. */
export const DEFAULT_RETENTION_MONTHS = 12;

export function retentionMonths(): number {
  const configured = Number(process.env.ATS_RETENTION_MONTHS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_RETENTION_MONTHS;
}

/**
 * Anonymising, not deleting: the application rows stay so the funnel and
 * time-to-hire numbers do not change, but nothing in them points at a
 * person any more.
 */
export async function anonymiseCandidate(
  candidateId: number,
  orgId: string,
  actor: { userId?: string; reason: "retention" | "request" },
) {
  const candidate = await db.query.candidates.findFirst({
    where: and(eq(candidates.id, candidateId), eq(candidates.orgId, orgId)),
  });
  if (!candidate) return false;

  if (candidate.resumeUrl) {
    try {
      await deleteFile(candidate.resumeUrl);
    } catch (error) {
      // A missing object is fine; anything else is worth knowing about.
      logger.warn("Could not delete a resume during erasure", { candidateId, error });
    }
  }

  await db
    .update(candidates)
    .set({
      firstName: "Removed",
      lastName: `candidate ${candidateId}`,
      email: `erased+${candidateId}@example.invalid`,
      phone: null,
      phoneNormalized: null,
      linkedinUrl: null,
      portfolioUrl: null,
      githubUrl: null,
      resumeUrl: null,
      resumeText: null,
      notes: null,
      location: null,
      dateOfBirth: null,
      education: null,
      workExperience: null,
      customLinks: null,
      alternatePhone: null,
      gender: null,
    })
    .where(eq(candidates.id, candidateId));

  await db.delete(atsConsents).where(eq(atsConsents.candidateId, candidateId));

  await createAuditLog({
    action: "ats.candidate_erased",
    userId: actor.userId ?? "system",
    orgId,
    targetId: String(candidateId),
    targetType: "candidate",
    metadata: { reason: actor.reason },
  });

  return true;
}

/**
 * The daily sweep: rejected candidates past the retention window, unless
 * they consented to stay in the talent pool and that consent still holds.
 */
export async function runRetention(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - retentionMonths());

  const stale = await db
    .selectDistinct({ id: candidates.id, orgId: candidates.orgId })
    .from(candidates)
    .innerJoin(candidateApplications, eq(candidateApplications.candidateId, candidates.id))
    .where(
      and(
        eq(candidateApplications.status, "REJECTED"),
        lt(candidateApplications.updatedAt, cutoff),
        isNotNull(candidates.email),
        // Already anonymised rows are left alone.
        sql`${candidates.email} NOT LIKE 'erased+%@example.invalid'`,
        // A live talent-pool consent keeps the record.
        sql`NOT EXISTS (
          SELECT 1 FROM ats_consents c
          WHERE c.candidate_id = ${candidates.id}
            AND c.type = 'TALENT_POOL'
            AND (c.expires_at IS NULL OR c.expires_at > now())
        )`,
      ),
    );

  let erased = 0;
  for (const row of stale) {
    if (await anonymiseCandidate(row.id, row.orgId, { reason: "retention" })) erased += 1;
  }

  if (erased > 0) {
    logger.info("ATS retention run", { erased, cutoff: cutoff.toISOString() });
  }
  return { considered: stale.length, erased };
}
