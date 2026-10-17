import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { atsStages } from "@/lib/db/schema";

/**
 * MIYO-0650: the pipeline every org starts with. Applied and the two end
 * states are always there; the middle is theirs to change.
 */
export const DEFAULT_STAGES: { name: string; type: string; sort: number }[] = [
  { name: "Applied", type: "APPLIED", sort: 0 },
  { name: "Screening", type: "SCREEN", sort: 1 },
  { name: "Interview", type: "INTERVIEW", sort: 2 },
  { name: "Offer", type: "OFFER", sort: 3 },
  { name: "Hired", type: "HIRED", sort: 4 },
  { name: "Rejected", type: "REJECTED", sort: 5 },
];

/** A stage of these types is part of how the ATS works and cannot be removed. */
export const FIXED_STAGE_TYPES = new Set(["APPLIED", "HIRED", "REJECTED"]);

/** The org's own stage list, seeded on first use. */
export async function orgStages(orgId: string) {
  const existing = await db
    .select()
    .from(atsStages)
    .where(and(eq(atsStages.orgId, orgId), isNull(atsStages.jobId)))
    .orderBy(asc(atsStages.sort));
  if (existing.length > 0) return existing;

  await db
    .insert(atsStages)
    .values(DEFAULT_STAGES.map((stage) => ({ ...stage, orgId, isDefault: true })))
    .onConflictDoNothing();

  return db
    .select()
    .from(atsStages)
    .where(and(eq(atsStages.orgId, orgId), isNull(atsStages.jobId)))
    .orderBy(asc(atsStages.sort));
}

/** A job's own stages where it has them, the org's otherwise. */
export async function stagesForJob(orgId: string, jobId: number) {
  const own = await db
    .select()
    .from(atsStages)
    .where(and(eq(atsStages.orgId, orgId), eq(atsStages.jobId, jobId)))
    .orderBy(asc(atsStages.sort));
  return own.length > 0 ? own : orgStages(orgId);
}

/**
 * Copy the org list onto a job, so changing the org list later does not
 * move candidates already in a pipeline.
 */
export async function copyStagesToJob(orgId: string, jobId: number) {
  const own = await db
    .select({ id: atsStages.id })
    .from(atsStages)
    .where(and(eq(atsStages.orgId, orgId), eq(atsStages.jobId, jobId)))
    .limit(1);
  if (own.length > 0) return;

  const defaults = await orgStages(orgId);
  if (defaults.length === 0) return;

  await db.insert(atsStages).values(
    defaults.map((stage) => ({
      orgId,
      jobId,
      name: stage.name,
      type: stage.type,
      sort: stage.sort,
      emailTemplateId: stage.emailTemplateId,
      autoEmail: stage.autoEmail,
      isDefault: false,
    })),
  );
}

/** The stage an application starts in. */
export async function firstStageId(orgId: string, jobId: number): Promise<number | null> {
  const stages = await stagesForJob(orgId, jobId);
  const applied = stages.find((s) => s.type === "APPLIED") ?? stages[0];
  return applied?.id ?? null;
}
