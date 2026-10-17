import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { atsJobMembers, atsRequisitions, jobPostings } from "@/lib/db/schema";
import { sanitizeHtml } from "@/lib/sanitize";
import { uniqueSlug } from "./slug";
import type { JobBody } from "@/lib/validations/ats-job";

/**
 * MIYO-0633: a job may be raised from a requisition, but only an approved
 * one — a rejected request must not become a posting by editing the URL.
 */
export async function requisitionUsable(
  orgId: string,
  requisitionId: number,
): Promise<"ok" | "missing" | "not-approved"> {
  const row = await db.query.atsRequisitions.findFirst({
    where: and(eq(atsRequisitions.id, requisitionId), eq(atsRequisitions.orgId, orgId)),
    columns: { status: true },
  });
  if (!row) return "missing";
  return row.status === "APPROVED" ? "ok" : "not-approved";
}

/** A slug free within the org. Jobs in different orgs may share one. */
export async function nextJobSlug(orgId: string, title: string): Promise<string> {
  const rows = await db
    .select({ slug: jobPostings.slug })
    .from(jobPostings)
    .where(eq(jobPostings.orgId, orgId));
  return uniqueSlug(
    title,
    rows.map((r) => r.slug).filter((s): s is string => Boolean(s)),
  );
}

/** The columns a job form writes, with the rich text cleaned up. */
export function jobColumnsFrom(body: JobBody) {
  return {
    title: body.title,
    requisitionId: body.requisitionId ?? null,
    departmentId: body.departmentId ?? null,
    workMode: body.workMode,
    location: body.location ?? null,
    type: body.employmentType,
    openings: body.openings,
    description: sanitizeHtml(body.description),
    requirements: body.requirements ? sanitizeHtml(body.requirements) : null,
    salaryMin: body.salaryMin?.toString() ?? null,
    salaryMax: body.salaryMax?.toString() ?? null,
    currency: body.currency,
    salaryVisible: body.salaryVisible,
    closesAt: body.closesAt ? new Date(body.closesAt) : null,
    seoTitle: body.seoTitle ?? null,
    seoDescription: body.seoDescription ?? null,
    updatedAt: new Date(),
  };
}

/** Replace the hiring team with the one the form sent. */
export async function setHiringTeam(
  jobId: number,
  team: { userId: string; role: string }[] | undefined,
) {
  if (!team) return;
  await db.delete(atsJobMembers).where(eq(atsJobMembers.jobId, jobId));
  if (team.length === 0) return;
  await db
    .insert(atsJobMembers)
    .values(team.map((m) => ({ jobId, userId: m.userId, role: m.role })))
    .onConflictDoNothing();
}
