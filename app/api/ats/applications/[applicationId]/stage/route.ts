import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  atsActivity,
  atsRefuseReasons,
  atsStages,
  candidateApplications,
  candidates,
  jobPostings,
} from "@/lib/db/schema";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";
import { canOnJob } from "@/lib/ats/access";
import { sendStageEmail } from "@/lib/ats/stage-emails";
import { createAuditLog } from "@/lib/audit-log";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  stageId: z.coerce.number().int().positive(),
  reasonId: z.coerce.number().int().positive().optional(),
  /** The mover may skip the stage's automatic email. */
  sendEmail: z.boolean().default(true),
});

/**
 * MIYO-0651: move one application to another stage. The stage must belong
 * to this job (or be an org stage), moving to Rejected may carry a reason,
 * and every move is written to ats_activity so time-in-stage is derivable.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  return withAuth(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const applicationId = Number((await params).applicationId);
    if (!Number.isInteger(applicationId)) return err("Invalid application ID.", 400);

    try {
      const body = await parseBody(req, bodySchema);

      const application = await db
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
            eq(candidateApplications.id, applicationId),
            eq(candidateApplications.orgId, session.orgId),
          ),
        )
        .limit(1);

      const found = application[0];
      if (!found) return err("Application not found.", 404);

      const actor = { userId: session.user.id, orgId: session.orgId, role: session.user.role };
      if (!(await canOnJob(actor, found.jobId, "manage_candidates"))) {
        return err("Forbidden", 403);
      }

      const stage = await db.query.atsStages.findFirst({
        where: and(eq(atsStages.id, body.stageId), eq(atsStages.orgId, session.orgId)),
      });
      if (!stage || (stage.jobId !== null && stage.jobId !== found.jobId)) {
        return err("That stage does not belong to this job.", 400);
      }

      const reason = body.reasonId
        ? await db.query.atsRefuseReasons.findFirst({
            where: and(
              eq(atsRefuseReasons.id, body.reasonId),
              eq(atsRefuseReasons.orgId, session.orgId),
            ),
          })
        : null;

      const [updated] = await db
        .update(candidateApplications)
        .set({
          stageId: stage.id,
          pipelineStage: stage.name,
          rejectedReasonId: reason?.id ?? null,
          // The old application_status enum has no HIRED; ACCEPTED is its
          // end state. New code reads the stage, not this column.
          status:
            stage.type === "HIRED"
              ? ("ACCEPTED" as const)
              : stage.type === "REJECTED"
                ? ("REJECTED" as const)
                : undefined,
          updatedAt: new Date(),
        })
        .where(eq(candidateApplications.id, applicationId))
        .returning();

      await db.insert(atsActivity).values({
        orgId: session.orgId,
        candidateId: found.candidateId,
        applicationId,
        actorId: session.user.id,
        type: "stage_moved",
        data: {
          fromStageId: found.stageId,
          toStageId: stage.id,
          toStage: stage.name,
          reason: reason?.name,
        },
      });

      // The stage's own template, or the refuse reason's. "Withdrew" has
      // neither, so nothing goes out.
      let emailSent = false;
      if (body.sendEmail) {
        const templateId = reason ? reason.emailTemplateId : stage.autoEmail ? stage.emailTemplateId : null;
        if (templateId) {
          const candidate = await db.query.candidates.findFirst({
            where: eq(candidates.id, found.candidateId),
          });
          if (candidate) {
            try {
              emailSent = await sendStageEmail(templateId, {
                orgId: session.orgId,
                candidate,
                jobTitle: found.jobTitle,
              });
            } catch (error) {
              logger.error("Stage email failed", { applicationId, templateId, error });
            }
          }
        }
      }

      await createAuditLog({
        action: "ats.stage_moved",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(applicationId),
        targetType: "candidate_application",
        metadata: { toStage: stage.name, reason: reason?.name },
      });

      return ok({ ...updated, emailSent });
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid move.", 400);
      throw e;
    }
  }, req);
}
