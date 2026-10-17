import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { withRoles, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { atsActivity, candidateApplications, candidateOffers, jobPostings } from "@/lib/db/schema";
import { ATS_ROLES } from "@/lib/constants/roles";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";

const createSchema = z.object({
  applicationId: z.coerce.number().int().positive(),
  offeredSalary: z.coerce.number().min(0),
  offeredDesignation: z.string().trim().min(1).max(120),
  joiningDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Pick a joining date."),
  validUntil: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Pick an expiry date."),
  templateId: z.coerce.number().int().positive().optional(),
  notes: z.string().trim().max(2000).optional(),
  /** CEO sign-off before the candidate sees it. */
  needsApproval: z.boolean().default(false),
});

/**
 * MIYO-0661: draft an offer. Only the ATS roles get here, so the money is
 * never served to an interviewer.
 */
export async function POST(req: NextRequest) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);

    try {
      const body = await parseBody(req, createSchema);

      const application = await db
        .select({
          id: candidateApplications.id,
          candidateId: candidateApplications.candidateId,
          jobId: candidateApplications.jobPostingId,
          jobTitle: jobPostings.title,
        })
        .from(candidateApplications)
        .innerJoin(jobPostings, eq(jobPostings.id, candidateApplications.jobPostingId))
        .where(
          and(
            eq(candidateApplications.id, body.applicationId),
            eq(candidateApplications.orgId, session.orgId),
          ),
        )
        .limit(1);

      const found = application[0];
      if (!found) return err("Application not found.", 404);

      const [created] = await db
        .insert(candidateOffers)
        .values({
          orgId: session.orgId,
          candidateId: found.candidateId,
          jobPostingId: found.jobId,
          offeredBy: session.user.id,
          offerStatus: "DRAFT",
          offeredSalary: body.offeredSalary.toString(),
          offeredDesignation: body.offeredDesignation,
          joiningDate: body.joiningDate.slice(0, 10),
          validUntil: body.validUntil.slice(0, 10),
          notes: body.notes ?? null,
          approvalStatus: body.needsApproval ? "PENDING" : "NOT_REQUIRED",
          submittedForCeoAt: body.needsApproval ? new Date() : null,
          offerLetterTemplateId: body.templateId ?? null,
        })
        .returning();

      await db.insert(atsActivity).values({
        orgId: session.orgId,
        candidateId: found.candidateId,
        applicationId: found.id,
        actorId: session.user.id,
        type: "offer_drafted",
        data: { offerId: created.id, designation: body.offeredDesignation },
      });

      return ok(created, 201);
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid offer.", 400);
      throw e;
    }
  }, req);
}
