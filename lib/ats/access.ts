import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { atsJobMembers, jobPostings } from "@/lib/db/schema";
import {
  capabilitiesFor,
  isOrgWideAtsRole,
  type AtsCapability,
} from "./capabilities";
import { ROLES } from "@/lib/constants/roles";

export type { AtsCapability };

/**
 * MIYO-0629: who may see and act on a job.
 *
 * Role alone is too coarse. A recruiter works every job; a hiring manager or
 * an interviewer works the ones they are on, and seeing a candidate for a job
 * you are not hiring for is a privacy problem, not a convenience one. Every
 * ATS route asks here, never just at the role.
 */
export interface AtsActor {
  userId: string;
  orgId: string;
  role: string | null | undefined;
}

/**
 * What this person may do on this job: their system role, widened by the seat
 * they hold on the job's hiring team.
 */
export async function jobCapabilities(
  actor: AtsActor,
  jobId: number,
): Promise<Set<AtsCapability>> {
  // A job in another organisation is invisible whatever the role says.
  const job = await db.query.jobPostings.findFirst({
    where: and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, actor.orgId)),
    columns: { id: true },
  });
  if (!job) return new Set();

  const membership = await db.query.atsJobMembers.findFirst({
    where: and(eq(atsJobMembers.jobId, jobId), eq(atsJobMembers.userId, actor.userId)),
    columns: { role: true },
  });

  return capabilitiesFor(actor.role, membership?.role);
}

export async function canOnJob(
  actor: AtsActor,
  jobId: number,
  capability: AtsCapability,
): Promise<boolean> {
  return (await jobCapabilities(actor, jobId)).has(capability);
}

/**
 * The jobs this person may see. `null` means every job in the org — the
 * caller then filters by orgId alone rather than building an IN list.
 */
export async function visibleJobIds(actor: AtsActor): Promise<number[] | null> {
  if (isOrgWideAtsRole(actor.role) || actor.role === ROLES.RECRUITER) return null;

  const rows = await db
    .select({ jobId: atsJobMembers.jobId })
    .from(atsJobMembers)
    .innerJoin(jobPostings, eq(jobPostings.id, atsJobMembers.jobId))
    .where(and(eq(atsJobMembers.userId, actor.userId), eq(jobPostings.orgId, actor.orgId)));

  return rows.map((r) => r.jobId);
}
