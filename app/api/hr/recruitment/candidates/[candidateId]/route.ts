import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates, candidateSlaTracking, candidateApplications, interviews, jobPostings, candidateDocumentsVault, candidateDocuments } from "@/lib/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { updateCandidateSchema } from "@/lib/validations/candidate";
import type { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  return withAuth(async (session) => {
    const { candidateId: id } = await params;
    const candidateId = Number(id);
    if (!candidateId) return err("Invalid candidate ID.", 400);

    const [candidate, slaRecords] = await Promise.all([
      db.query.candidates.findFirst({
        where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
        with: {
          applications: { with: { jobPosting: true } },
          interviews: {
            with: {
              scorecards: true,
              interviewer: { columns: { id: true, firstName: true, lastName: true, email: true, image: true } },
            },
            orderBy: (t, { desc }) => [desc(t.scheduledAt)],
          },
        },
      }),
      db.query.candidateSlaTracking.findMany({
        where: and(
          eq(candidateSlaTracking.candidateId, candidateId),
          eq(candidateSlaTracking.orgId, session.orgId)
        ),
        orderBy: (t, { asc }) => [asc(t.stage)],
      }),
    ]);

    if (!candidate) return err("Candidate not found.", 404);

    return ok({ ...candidate, slaTracking: slaRecords });
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Forbidden", 403);
    }

    const { candidateId: id } = await params;
    const candidateId = Number(id);
    if (!candidateId) return err("Invalid candidate ID.", 400);

    const existing = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
    });
    if (!existing) return err("Candidate not found.", 404);

    const body = await parseBody(req, updateCandidateSchema);

    if (body.email !== undefined && body.email.toLowerCase() !== (existing.email ?? "").toLowerCase()) {
      const emailTaken = await db.query.candidates.findFirst({
        where: and(eq(candidates.orgId, session.orgId), ilike(candidates.email, body.email)),
        columns: { id: true },
      });
      if (emailTaken) {
        return err("Another candidate with this email already exists.", 409);
      }
    }

    await db
      .update(candidates)
      .set({
        ...(body.firstName !== undefined && { firstName: body.firstName }),
        ...(body.lastName !== undefined && { lastName: body.lastName }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.alternatePhone !== undefined && { alternatePhone: body.alternatePhone || null }),
        ...(body.dateOfBirth !== undefined && { dateOfBirth: body.dateOfBirth || null }),
        ...(body.gender !== undefined && { gender: (body.gender || null) as never }),
        ...(body.location !== undefined && { location: body.location || null }),
        ...(body.preferredLocation !== undefined && { preferredLocation: body.preferredLocation || null }),
        ...(body.requisitionId !== undefined && { requisitionId: body.requisitionId || null }),
        ...(body.employmentType !== undefined && { employmentType: body.employmentType || null }),
        ...(body.applicationDate !== undefined && { applicationDate: body.applicationDate || null }),
        ...(body.experienceYears !== undefined && { experienceYears: body.experienceYears?.toString() ?? null }),
        ...(body.relevantExperienceMonths !== undefined && { relevantExperienceMonths: body.relevantExperienceMonths ?? null }),
        ...(body.currentCompany !== undefined && { currentCompany: body.currentCompany || null }),
        ...(body.currentRole !== undefined && { currentRole: body.currentRole || null }),
        ...(body.currentEmploymentStatus !== undefined && { currentEmploymentStatus: body.currentEmploymentStatus || null }),
        ...(body.noticePeriodDays !== undefined && { noticePeriodDays: body.noticePeriodDays ?? null }),
        ...(body.availableFrom !== undefined && { availableFrom: body.availableFrom || null }),
        ...(body.education !== undefined && { education: body.education }),
        ...(body.skills !== undefined && { skills: body.skills }),
        ...(body.currentCtc !== undefined && { currentCtc: body.currentCtc?.toString() ?? null }),
        ...(body.expectedCtc !== undefined && { expectedCtc: body.expectedCtc?.toString() ?? null }),
        ...(body.salaryCurrency !== undefined && { salaryCurrency: body.salaryCurrency || null }),
        ...(body.resumeUrl !== undefined && { resumeUrl: body.resumeUrl || null }),
        ...(body.coverLetterUrl !== undefined && { coverLetterUrl: body.coverLetterUrl || null }),
        ...(body.portfolioUrl !== undefined && { portfolioUrl: body.portfolioUrl || null }),
        ...(body.linkedinUrl !== undefined && { linkedinUrl: body.linkedinUrl || null }),
        ...(body.githubUrl !== undefined && { githubUrl: body.githubUrl || null }),
        ...(body.workAuthorization !== undefined && { workAuthorization: body.workAuthorization || null }),
        ...(body.willingToRelocate !== undefined && { willingToRelocate: body.willingToRelocate }),
        ...(body.preferredWorkMode !== undefined && { preferredWorkMode: body.preferredWorkMode || null }),
        ...(body.referralName !== undefined && { referralName: body.referralName || null }),
        ...(body.appliedTitle !== undefined && { appliedTitle: body.appliedTitle || null }),
        ...(body.appliedDepartment !== undefined && { appliedDepartment: body.appliedDepartment || null }),
        ...(body.skillEntries !== undefined && { skillEntries: body.skillEntries }),
        ...(body.source !== undefined && { source: body.source }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.rating !== undefined && { rating: body.rating }),
        ...(body.status !== undefined && { status: body.status }),
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, candidateId));

    // Optionally link the candidate to a job opening if one was selected and
    // an application does not already exist for that posting.
    if (body.jobPostingId) {
      const [job, existingApp] = await Promise.all([
        db.query.jobPostings.findFirst({
          where: and(
            eq(jobPostings.id, body.jobPostingId),
            eq(jobPostings.orgId, session.orgId)
          ),
          columns: { id: true },
        }),
        db.query.candidateApplications.findFirst({
          where: and(
            eq(candidateApplications.candidateId, candidateId),
            eq(candidateApplications.jobPostingId, body.jobPostingId)
          ),
          columns: { id: true },
        }),
      ]);
      if (job && !existingApp) {
        await db.insert(candidateApplications).values({
          orgId: session.orgId,
          candidateId,
          jobPostingId: job.id,
          status: "APPLIED",
        });
      }
    }

    return ok({ success: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Forbidden", 403);
    }

    const { candidateId: id } = await params;
    const candidateId = Number(id);
    if (!candidateId) return err("Invalid candidate ID.", 400);

    const existing = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)),
    });
    if (!existing) return err("Candidate not found.", 404);

    await db.transaction(async (tx) => {
      await tx.delete(candidateDocumentsVault).where(eq(candidateDocumentsVault.candidateId, candidateId));
      await tx.delete(candidateDocuments).where(eq(candidateDocuments.candidateId, candidateId));
      await tx.delete(candidateSlaTracking).where(eq(candidateSlaTracking.candidateId, candidateId));
      await tx.delete(interviews).where(eq(interviews.candidateId, candidateId));
      await tx.delete(candidateApplications).where(eq(candidateApplications.candidateId, candidateId));
      await tx.delete(candidates).where(and(eq(candidates.id, candidateId), eq(candidates.orgId, session.orgId)));
    });

    return ok({ success: true });
  });
}
