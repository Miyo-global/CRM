import { withAuth, ok, err, parseBody, parseQuery } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { candidates, candidateApplications, jobPostings } from "@/lib/db/schema";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { eq, and, desc, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { createCandidateSchema } from "@/lib/validations/candidate";
import type { NextRequest } from "next/server";
import type { CandidateListItem, CandidateApplicationSummary } from "@/types/hr";

const listSchema = z.object({
  status: z.enum(["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"]).optional(),
  jobId: z.coerce.number().int().positive().optional(),
  source: z.string().trim().optional(),
  limit: z.coerce.number().min(1).max(200).default(100),
  offset: z.coerce.number().min(0).default(0),
});

function mapCandidateListItem(
  candidate: typeof candidates.$inferSelect & {
    applications?: Array<
      typeof candidateApplications.$inferSelect & {
        jobPosting?: { id: number; title: string | null; status: string | null } | null;
      }
    >;
  },
): CandidateListItem {
  const applications: CandidateApplicationSummary[] = (candidate.applications ?? []).map((app) => ({
    id: app.id,
    jobPostingId: app.jobPostingId,
    jobTitle: app.jobPosting?.title ?? candidate.appliedTitle ?? "Unknown role",
    jobStatus: (app.jobPosting?.status as CandidateApplicationSummary["jobStatus"]) ?? null,
    applicationStatus: app.status,
    pipelineStage: app.pipelineStage,
    appliedAt: app.appliedAt,
  }));

  const primary = applications[0] ?? null;

  return {
    ...candidate,
    applications,
    primaryJobTitle: primary?.jobTitle ?? candidate.appliedTitle ?? null,
    primaryJobPostingId: primary?.jobPostingId ?? null,
    primaryAppliedAt: primary?.appliedAt ?? candidate.createdAt,
  };
}

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const { status, jobId, source, limit, offset } = parseQuery(req, listSchema);

    const conditions = [eq(candidates.orgId, session.orgId)];
    if (status) conditions.push(eq(candidates.status, status));
    if (source) conditions.push(eq(candidates.source, source));
    if (jobId) {
      conditions.push(
        sql`${candidates.id} IN (
          SELECT ${candidateApplications.candidateId}
          FROM ${candidateApplications}
          WHERE ${candidateApplications.orgId} = ${session.orgId}
            AND ${candidateApplications.jobPostingId} = ${jobId}
        )`,
      );
    }

    const rows = await db.query.candidates.findMany({
      where: and(...conditions),
      orderBy: [desc(candidates.updatedAt)],
      limit,
      offset,
      with: {
        applications: {
          with: {
            jobPosting: { columns: { id: true, title: true, status: true } },
          },
          orderBy: (apps, { desc: d }) => [d(apps.appliedAt)],
        },
      },
    });

    return ok(rows.map(mapCandidateListItem));
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Forbidden", 403);
    }
    const body = await parseBody(req, createCandidateSchema);

    const duplicate = await db.query.candidates.findFirst({
      where: and(eq(candidates.orgId, session.orgId), ilike(candidates.email, body.email)),
      columns: { id: true },
    });
    if (duplicate) {
      return err("A candidate with this email already exists.", 409);
    }

    const [candidate] = await db
      .insert(candidates)
      .values({
        orgId: session.orgId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        alternatePhone: body.alternatePhone,
        dateOfBirth: body.dateOfBirth || null,
        gender: body.gender as never,
        location: body.location,
        preferredLocation: body.preferredLocation,
        requisitionId: body.requisitionId,
        employmentType: body.employmentType,
        applicationDate: body.applicationDate || null,
        experienceYears: body.experienceYears?.toString(),
        relevantExperienceMonths: body.relevantExperienceMonths,
        currentCompany: body.currentCompany,
        currentRole: body.currentRole,
        currentEmploymentStatus: body.currentEmploymentStatus,
        noticePeriodDays: body.noticePeriodDays,
        availableFrom: body.availableFrom || null,
        education: body.education,
        skills: body.skills,
        currentCtc: body.currentCtc?.toString(),
        expectedCtc: body.expectedCtc?.toString(),
        salaryCurrency: body.salaryCurrency,
        resumeUrl: body.resumeUrl,
        coverLetterUrl: body.coverLetterUrl,
        portfolioUrl: body.portfolioUrl,
        linkedinUrl: body.linkedinUrl,
        githubUrl: body.githubUrl,
        workAuthorization: body.workAuthorization,
        willingToRelocate: body.willingToRelocate,
        preferredWorkMode: body.preferredWorkMode,
        referralName: body.referralName,
        appliedTitle: body.appliedTitle,
        appliedDepartment: body.appliedDepartment,
        skillEntries: body.skillEntries,
        source: body.source || "DIRECT",
        status: "NEW",
        notes: body.notes,
      })
      .returning();

    if (body.jobPostingId) {
      const job = await db.query.jobPostings.findFirst({
        where: and(
          eq(jobPostings.id, body.jobPostingId),
          eq(jobPostings.orgId, session.orgId),
        ),
        columns: { id: true },
      });
      if (job) {
        await db.insert(candidateApplications).values({
          orgId: session.orgId,
          candidateId: candidate.id,
          jobPostingId: job.id,
          status: "APPLIED",
          coverLetter: body.coverLetterUrl || null,
        });
      }
    }

    const created = await db.query.candidates.findFirst({
      where: and(eq(candidates.id, candidate.id), eq(candidates.orgId, session.orgId)),
      with: {
        applications: {
          with: {
            jobPosting: { columns: { id: true, title: true, status: true } },
          },
          orderBy: (apps, { desc: d }) => [d(apps.appliedAt)],
        },
      },
    });

    return ok(created ? mapCandidateListItem(created) : mapCandidateListItem({ ...candidate, applications: [] }));
  });
}
