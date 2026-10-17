import type { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import { withRoles, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  atsActivity,
  atsRequisitions,
  atsStages,
  candidateApplications,
  candidateOffers,
  candidates,
  departments,
  jobPostings,
  users,
} from "@/lib/db/schema";
import { ATS_ROLES } from "@/lib/constants/roles";
import { ATS_MODULE_ENABLED } from "@/lib/constants/modules";

async function loadApplication(orgId: string, applicationId: number) {
  const rows = await db
    .select({
      id: candidateApplications.id,
      candidateId: candidates.id,
      firstName: candidates.firstName,
      lastName: candidates.lastName,
      email: candidates.email,
      phone: candidates.phone,
      jobId: jobPostings.id,
      jobTitle: jobPostings.title,
      departmentId: jobPostings.departmentId,
      departmentName: departments.name,
      requisitionId: jobPostings.requisitionId,
    })
    .from(candidateApplications)
    .innerJoin(candidates, eq(candidates.id, candidateApplications.candidateId))
    .innerJoin(jobPostings, eq(jobPostings.id, candidateApplications.jobPostingId))
    .leftJoin(departments, eq(departments.id, jobPostings.departmentId))
    .where(
      and(
        eq(candidateApplications.id, applicationId),
        eq(candidateApplications.orgId, orgId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * MIYO-0663: what the onboarding wizard should start with. The hire itself
 * still goes through /api/hr/employees/onboard, which already creates the
 * user, the salary structure and the checklist, and already refuses a
 * duplicate email — this only fills the form in.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const applicationId = Number((await params).applicationId);
    if (!Number.isInteger(applicationId)) return err("Invalid application ID.", 400);

    const application = await loadApplication(session.orgId, applicationId);
    if (!application) return err("Application not found.", 404);

    const offer = await db.query.candidateOffers.findFirst({
      where: and(
        eq(candidateOffers.candidateId, application.candidateId),
        eq(candidateOffers.orgId, session.orgId),
      ),
      orderBy: [desc(candidateOffers.id)],
    });

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, application.email.toLowerCase()),
      columns: { id: true },
    });

    return ok({
      applicationId,
      candidateId: application.candidateId,
      firstName: application.firstName,
      lastName: application.lastName,
      email: application.email,
      phone: application.phone,
      designation: offer?.offeredDesignation ?? application.jobTitle,
      departmentId: application.departmentId,
      departmentName: application.departmentName,
      joiningDate: offer?.joiningDate ?? null,
      monthlySalary: offer?.offeredSalary ?? null,
      offerAccepted: offer?.offerStatus === "ACCEPTED",
      existingUserId: existingUser?.id ?? null,
    });
  }, req);
}

const bodySchema = z.object({
  /** The user the onboarding wizard created, or one that already existed. */
  userId: z.string().min(1),
});

/** Mark the application hired and close the requisition it came from. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  return withRoles(ATS_ROLES)(async (session) => {
    if (!ATS_MODULE_ENABLED) return err("Hiring is not enabled.", 404);
    const applicationId = Number((await params).applicationId);
    if (!Number.isInteger(applicationId)) return err("Invalid application ID.", 400);

    try {
      const body = await parseBody(req, bodySchema);

      const application = await loadApplication(session.orgId, applicationId);
      if (!application) return err("Application not found.", 404);

      const hiredStage = await db.query.atsStages.findFirst({
        where: and(eq(atsStages.orgId, session.orgId), eq(atsStages.type, "HIRED")),
      });

      await db
        .update(candidateApplications)
        .set({
          status: "ACCEPTED",
          stageId: hiredStage?.id ?? undefined,
          pipelineStage: hiredStage?.name ?? "Hired",
          updatedAt: new Date(),
        })
        .where(eq(candidateApplications.id, applicationId));

      await db
        .update(candidates)
        .set({ status: "HIRED" })
        .where(eq(candidates.id, application.candidateId));

      // The requisition this job came from is filled once someone starts.
      if (application.requisitionId) {
        await db
          .update(atsRequisitions)
          .set({ status: "FILLED", updatedAt: new Date() })
          .where(
            and(
              eq(atsRequisitions.id, application.requisitionId),
              eq(atsRequisitions.orgId, session.orgId),
            ),
          );
      }

      await db.insert(atsActivity).values({
        orgId: session.orgId,
        candidateId: application.candidateId,
        applicationId,
        actorId: session.user.id,
        type: "hired",
        data: { userId: body.userId, jobId: application.jobId },
      });

      return ok({ hired: true });
    } catch (e) {
      if (e instanceof ZodError) return err(e.issues[0]?.message ?? "Invalid request.", 400);
      throw e;
    }
  }, req);
}
