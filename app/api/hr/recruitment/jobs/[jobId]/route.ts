import { withAuth, ok, err } from "@/lib/api/helpers";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { jobPostings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { revalidatePath } from "next/cache";
import { notifyHrRecruitmentEvent } from "@/lib/hr/recruitment-notifications";
import { jobOpeningUpdateSchema } from "@/lib/validations/job-opening";
import type { NextRequest } from "next/server";

function mapJobOpeningBody(body: ReturnType<typeof jobOpeningUpdateSchema.parse>) {
  const experienceLabel =
    body.minExperience != null
      ? body.maxExperience != null
        ? `${body.minExperience}-${body.maxExperience} years`
        : `${body.minExperience}+ years`
      : null;

  return {
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
    status: body.status,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  return withAuth(async (session) => {
    const { jobId: id } = await params;
    const jobId = Number(id);
    if (!jobId) return err("Invalid job ID.", 400);

    const job = await db.query.jobPostings.findFirst({
      where: and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, session.orgId)),
      with: { applications: true },
    });

    if (!job) return err("Job posting not found.", 404);
    return ok(job);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can update job postings.", 403);
    }

    const { jobId: id } = await params;
    const jobId = Number(id);
    if (!jobId) return err("Invalid job ID.", 400);

    const existing = await db.query.jobPostings.findFirst({
      where: and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, session.orgId)),
    });
    if (!existing) return err("Job posting not found.", 404);

    const raw = await req.json();

    if (
      raw &&
      typeof raw === "object" &&
      Object.keys(raw).length === 1 &&
      "status" in raw &&
      typeof (raw as { status: unknown }).status === "string"
    ) {
      const nextStatus = (raw as { status: typeof existing.status }).status;
      const valid = ["DRAFT", "OPEN", "PAUSED", "CLOSED", "FILLED"] as const;
      if (!valid.includes(nextStatus as (typeof valid)[number])) {
        return err("Invalid status.", 400);
      }

      const previousStatus = existing.status;
      await db
        .update(jobPostings)
        .set({ status: nextStatus, updatedAt: new Date() })
        .where(eq(jobPostings.id, jobId));

      if (nextStatus === "OPEN" && previousStatus !== "OPEN") {
        void notifyHrRecruitmentEvent(session.orgId, "job_published", {
          jobId,
          jobTitle: existing.title,
          location: existing.location,
          jobType: existing.type,
          applicationDeadline: existing.applicationDeadline,
          actorName: session.user.name,
        });
      }

      revalidatePath("/careers", "layout");
      return ok({ success: true });
    }

    const body = jobOpeningUpdateSchema.parse(raw);

    const dedupeTitle = body.title.trim().toLowerCase();
    const dedupeLocation = (body.officeLocation || body.stateCity || "").trim().toLowerCase();
    const dedupeType = body.type ?? "FULL_TIME";

    const existingJobs = await db.query.jobPostings.findMany({
      where: and(eq(jobPostings.orgId, session.orgId), eq(jobPostings.type, dedupeType)),
      columns: { id: true, title: true, location: true, status: true },
    });
    const isDuplicate = existingJobs.some(
      (j) =>
        j.id !== jobId &&
        j.status !== "CLOSED" &&
        j.status !== "FILLED" &&
        (j.title ?? "").trim().toLowerCase() === dedupeTitle &&
        (j.location ?? "").trim().toLowerCase() === dedupeLocation,
    );
    if (isDuplicate) {
      return err("A job posting with the same title, location and type already exists.", 409);
    }

    const previousStatus = existing.status;
    const nextStatus = body.status;

    const [job] = await db
      .update(jobPostings)
      .set({ ...mapJobOpeningBody(body), updatedAt: new Date() })
      .where(eq(jobPostings.id, jobId))
      .returning();

    if (nextStatus === "OPEN" && previousStatus !== "OPEN") {
      void notifyHrRecruitmentEvent(session.orgId, "job_published", {
        jobId,
        jobTitle: job?.title ?? existing.title,
        location: job?.location ?? existing.location,
        jobType: job?.type ?? existing.type,
        applicationDeadline: job?.applicationDeadline ?? existing.applicationDeadline,
        actorName: session.user.name,
      });
    }

    revalidatePath("/careers", "layout");

    return ok({ success: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  return withAuth(async (session) => {
    if (!isAdminOrOwner(session.user.role)) {
      return err("Only admins can delete job postings.", 403);
    }

    const { jobId: id } = await params;
    const jobId = Number(id);
    if (!jobId) return err("Invalid job ID.", 400);

    const existing = await db.query.jobPostings.findFirst({
      where: and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, session.orgId)),
    });
    if (!existing) return err("Job posting not found.", 404);

    await db.delete(jobPostings).where(
      and(eq(jobPostings.id, jobId), eq(jobPostings.orgId, session.orgId))
    );

    void notifyHrRecruitmentEvent(session.orgId, "job_deleted", {
      jobId,
      jobTitle: existing.title,
      location: existing.location,
      jobType: existing.type,
      actorName: session.user.name,
    });

    revalidatePath("/careers", "layout");

    return ok({ success: true });
  });
}
