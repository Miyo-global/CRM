import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { jobOpeningSchema } from "@/lib/validations/job-opening";
import { notifyHrRecruitmentEvent } from "@/lib/hr/recruitment-notifications";
import type { NextRequest } from "next/server";
import type { JobPostingStatus } from "@/types/hr";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const statusParam = req.nextUrl.searchParams.get("status");
    const validStatuses: JobPostingStatus[] = ["DRAFT", "OPEN", "PAUSED", "CLOSED", "FILLED"];
    const status = validStatuses.includes(statusParam as JobPostingStatus)
      ? (statusParam as JobPostingStatus)
      : null;

    const conditions = [eq(jobPostings.orgId, session.orgId)];
    if (status) conditions.push(eq(jobPostings.status, status));

    const data = await db.query.jobPostings.findMany({
      where: and(...conditions),
      orderBy: [desc(jobPostings.createdAt)],
    });

    return ok(data);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can create job postings.", 403);
    }

    const body = await parseBody(req, jobOpeningSchema);

    const dedupeTitle = body.title.trim().toLowerCase();
    const dedupeLocation = (body.officeLocation || body.stateCity || "").trim().toLowerCase();
    const dedupeType = body.type ?? "FULL_TIME";

    const existingJobs = await db.query.jobPostings.findMany({
      where: and(eq(jobPostings.orgId, session.orgId), eq(jobPostings.type, dedupeType)),
      columns: { id: true, title: true, location: true, status: true },
    });
    const isDuplicate = existingJobs.some(
      (j) =>
        j.status !== "CLOSED" &&
        j.status !== "FILLED" &&
        (j.title ?? "").trim().toLowerCase() === dedupeTitle &&
        (j.location ?? "").trim().toLowerCase() === dedupeLocation,
    );
    if (isDuplicate) {
      return err("A job posting with the same title, location and type already exists.", 409);
    }

    const experienceLabel =
      body.minExperience != null
        ? body.maxExperience != null
          ? `${body.minExperience}-${body.maxExperience} years`
          : `${body.minExperience}+ years`
        : null;

    const [job] = await db
      .insert(jobPostings)
      .values({
        orgId: session.orgId,
        title: body.title,
        departmentId: body.departmentId ?? null,
        role: body.role || null,
        type: body.type ?? "FULL_TIME",
        workMode: body.workMode ?? null,
        openings: body.openings ?? 1,
        country: body.country || null,
        stateCity: body.stateCity || null,
        officeLocation: body.officeLocation || null,
        location: body.officeLocation || body.stateCity || null,
        salaryMin: body.salaryMin != null ? body.salaryMin.toString() : null,
        salaryMax: body.salaryMax != null ? body.salaryMax.toString() : null,
        currency: body.currency ?? "INR",
        salaryType: body.salaryType ?? "ANNUAL",
        bonus: body.bonus || null,
        minExperience: body.minExperience ?? null,
        maxExperience: body.maxExperience ?? null,
        experience: experienceLabel,
        educationLevel: body.educationLevel ?? null,
        requiredSkills: body.requiredSkills ?? null,
        preferredSkills: body.preferredSkills ?? null,
        tags: body.tags ?? null,
        overview: body.overview || null,
        description: body.overview || null,
        responsibilities: body.responsibilities || null,
        requirements: body.requirements || null,
        benefits: body.benefits || null,
        hiringManager: body.hiringManager || null,
        interviewRounds: body.interviewRounds ?? null,
        questionBank: body.questionBank || null,
        resumeRequired: body.resumeRequired ?? true,
        coverLetterRequired: body.coverLetterRequired ?? false,
        applicationFields: (body.applicationFields as import("@/lib/hr/application-field-config").ApplicationFieldConfig) ?? null,
        customFields: body.customFields ?? null,
        visibility: body.visibility ?? "PUBLIC",
        applicationDeadline: body.applicationDeadline
          ? formatDateOnly(new Date(body.applicationDeadline))
          : null,
        priority: body.priority ?? "MEDIUM",
        referralEnabled: body.referralEnabled ?? false,
        approvalRequired: body.approvalRequired ?? false,
        hiringFlowTemplateId: body.hiringFlowTemplateId ?? null,
        status: body.status === "OPEN" ? "OPEN" : "DRAFT",
        postedBy: session.user.id,
      })
      .returning();

    if (job) {
      void notifyHrRecruitmentEvent(session.orgId, "job_created", {
        jobId: job.id,
        jobTitle: job.title,
        location: job.location,
        jobType: job.type,
        applicationDeadline: job.applicationDeadline,
        actorName: session.user.name,
      });
    }

    return ok(job);
  });
}
