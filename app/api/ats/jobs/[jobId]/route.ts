import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { ZodError } from "zod";

import { withRoles, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { atsJobMembers, jobPostings } from "@/lib/db/schema";
import { ATS_ROLES } from "@/lib/constants/roles";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { canOnJob } from "@/lib/ats/access";
import { jobColumnsFrom, requisitionUsable, setHiringTeam } from "@/lib/ats/jobs";
import { jobBodySchema } from "@/lib/validations/ats-job";

function actorFor(session: { user: { id: string; role?: string }; orgId: string }) {
  return { userId: session.user.id, orgId: session.orgId, role: session.user.role };
}

/** MIYO-0633: one job, with its hiring team. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const jobId = Number((await params).jobId);
    if (!Number.isInteger(jobId)) return err("Invalid job ID.", 400);

    if (!(await canOnJob(actorFor(session), jobId, "view"))) {
      return err("Job not found.", 404);
    }

    const job = await db.query.jobPostings.findFirst({
      where: and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, session.orgId)),
    });
    if (!job) return err("Job not found.", 404);

    const team = await db
      .select({ userId: atsJobMembers.userId, role: atsJobMembers.role })
      .from(atsJobMembers)
      .where(eq(atsJobMembers.jobId, jobId));

    return ok({ ...job, hiringTeam: team });
  }, req);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const jobId = Number((await params).jobId);
    if (!Number.isInteger(jobId)) return err("Invalid job ID.", 400);

    if (!(await canOnJob(actorFor(session), jobId, "manage_job"))) {
      return err("Forbidden", 403);
    }

    try {
      const body = await parseBody(req, jobBodySchema);

      if (body.requisitionId) {
        const usable = await requisitionUsable(session.orgId, body.requisitionId);
        if (usable === "missing") return err("Requisition not found.", 404);
        if (usable === "not-approved") {
          return err("Only an approved requisition can become a job.", 409);
        }
      }

      const [updated] = await db
        .update(jobPostings)
        .set(jobColumnsFrom(body))
        .where(and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, session.orgId)))
        .returning();
      if (!updated) return err("Job not found.", 404);

      await setHiringTeam(jobId, body.hiringTeam);

      return ok(updated);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid job.", 400);
      throw e;
    }
  }, req);
}
