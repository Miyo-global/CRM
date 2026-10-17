import type { NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z, ZodError } from "zod";

import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  atsActivity,
  atsCandidateTagLinks,
  atsRefuseReasons,
  atsStages,
  candidateApplications,
  candidates,
  jobPostings,
} from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { canOnJob } from "@/lib/ats/access";
import { sendStageEmail } from "@/lib/ats/stage-emails";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  applicationIds: z.array(z.coerce.number().int().positive()).min(1).max(200),
  action: z.enum(["move", "reject", "tag"]),
  stageId: z.coerce.number().int().positive().optional(),
  reasonId: z.coerce.number().int().positive().optional(),
  tagId: z.coerce.number().int().positive().optional(),
  sendEmail: z.boolean().default(false),
});

/**
 * MIYO-0652: the same move, rejection or tag over many applications. Every
 * one is checked against the job's hiring team, so a bulk action cannot
 * reach a job the person is not on.
 */
export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);

    try {
      const body = await parseBody(req, bodySchema);

      const rows = await db
        .select({
          id: candidateApplications.id,
          candidateId: candidateApplications.candidateId,
          jobId: candidateApplications.jobPostingId,
          stageId: candidateApplications.stageId,
          jobTitle: jobPostings.title,
        })
        .from(candidateApplications)
        .innerJoin(jobPostings, eq(jobPostings.id, candidateApplications.jobPostingId))
        .where(
          and(
            inArray(candidateApplications.id, body.applicationIds),
            eq(candidateApplications.orgId, session.orgId),
          ),
        );
      if (rows.length === 0) return err("Nothing to act on.", 404);

      const actor = { userId: session.user.id, orgId: session.orgId, role: session.user.role };
      const jobIds = [...new Set(rows.map((r) => r.jobId))];
      for (const jobId of jobIds) {
        if (!(await canOnJob(actor, jobId, "manage_candidates"))) {
          return err("Some of these are on a job you are not hiring for.", 403);
        }
      }

      if (body.action === "tag") {
        if (!body.tagId) return err("Choose a tag.", 400);
        await db
          .insert(atsCandidateTagLinks)
          .values(rows.map((row) => ({ candidateId: row.candidateId, tagId: body.tagId as number })))
          .onConflictDoNothing();
        return ok({ updated: rows.length });
      }

      const stage =
        body.action === "reject"
          ? await db.query.atsStages.findFirst({
              where: and(eq(atsStages.orgId, session.orgId), eq(atsStages.type, "REJECTED")),
            })
          : body.stageId
            ? await db.query.atsStages.findFirst({
                where: and(eq(atsStages.id, body.stageId), eq(atsStages.orgId, session.orgId)),
              })
            : null;
      if (!stage) return err("Choose a stage.", 400);

      const reason = body.reasonId
        ? await db.query.atsRefuseReasons.findFirst({
            where: and(
              eq(atsRefuseReasons.id, body.reasonId),
              eq(atsRefuseReasons.orgId, session.orgId),
            ),
          })
        : null;

      await db
        .update(candidateApplications)
        .set({
          stageId: stage.id,
          pipelineStage: stage.name,
          rejectedReasonId: reason?.id ?? null,
          status:
            stage.type === "HIRED"
              ? ("ACCEPTED" as const)
              : stage.type === "REJECTED"
                ? ("REJECTED" as const)
                : undefined,
          updatedAt: new Date(),
        })
        .where(inArray(candidateApplications.id, rows.map((r) => r.id)));

      await db.insert(atsActivity).values(
        rows.map((row) => ({
          orgId: session.orgId,
          candidateId: row.candidateId,
          applicationId: row.id,
          actorId: session.user.id,
          type: "stage_moved",
          data: {
            fromStageId: row.stageId,
            toStageId: stage.id,
            toStage: stage.name,
            reason: reason?.name,
            bulk: true,
          },
        })),
      );

      // Mail goes out one at a time; one bad address must not stop the rest.
      let emailsSent = 0;
      const templateId = reason ? reason.emailTemplateId : stage.autoEmail ? stage.emailTemplateId : null;
      if (body.sendEmail && templateId) {
        const people = await db
          .select({
            id: candidates.id,
            firstName: candidates.firstName,
            email: candidates.email,
          })
          .from(candidates)
          .where(inArray(candidates.id, rows.map((r) => r.candidateId)));
        const byId = new Map(people.map((p) => [p.id, p]));

        for (const row of rows) {
          const candidate = byId.get(row.candidateId);
          if (!candidate) continue;
          try {
            if (
              await sendStageEmail(templateId, {
                orgId: session.orgId,
                candidate,
                jobTitle: row.jobTitle,
              })
            ) {
              emailsSent += 1;
            }
          } catch (error) {
            logger.error("Bulk stage email failed", { applicationId: row.id, error });
          }
        }
      }

      return ok({ updated: rows.length, emailsSent });
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid bulk action.", 400);
      throw e;
    }
  }, req);
}
