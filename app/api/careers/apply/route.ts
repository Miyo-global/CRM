import { ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { jobPostings, candidates, candidateApplications } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { z } from "zod";
import { isApplicationDeadlinePassed } from "@/lib/careers/application-deadline";
import { careersApplySchema, type CareersApplyInput } from "@/lib/careers/apply-validation";
import { REJECTION_COOLDOWN_DAYS, MS_PER_DAY } from "@/lib/constants/recruitment";
import { notifyHrRecruitmentEvent } from "@/lib/hr/recruitment-notifications";
import { getApplicationConfirmationEmail } from "@/lib/email-templates/hr-recruitment";
import { sendEmail } from "@/lib/email/sender";
import { checkRateLimitRedis } from "@/lib/rate-limit-redis";
import { logger } from "@/lib/logger";
import type { NextRequest } from "next/server";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
  const rl = await checkRateLimitRedis("public-intake", getClientIp(req));
  if (!rl.allowed) {
    return err("Too many requests. Please try again later.", 429);
  }

  let body: CareersApplyInput;
  try {
    const raw = await req.json();
    body = careersApplySchema.parse(raw);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return err(e.issues[0]?.message ?? "Invalid request body.", 400);
    }
    return err("Invalid request body.", 400);
  }

  const {
    jobPostingId,
    name,
    email,
    phone,
    location,
    linkedinUrl,
    githubUrl,
    currentRole,
    experienceYears,
    skills,
    education,
    workExperience,
    customLinks,
    coverLetter,
    resumeUrl,
  } = body;

  if (!resumeUrl) {
    return err("A résumé is required to apply.", 400);
  }

  const storageBaseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "");
  if (resumeUrl.startsWith("http")) {
    if (storageBaseUrl && !resumeUrl.startsWith(`${storageBaseUrl}/`)) {
      return err("Invalid resume reference.", 400);
    }
  } else if (!/^o\/[a-zA-Z0-9_-]+\/.+/.test(resumeUrl)) {
    return err("Invalid resume reference.", 400);
  }

  const [job] = await db
    .select({
      id: jobPostings.id,
      orgId: jobPostings.orgId,
      title: jobPostings.title,
      applicationDeadline: jobPostings.applicationDeadline,
    })
    .from(jobPostings)
    .where(and(eq(jobPostings.id, jobPostingId), eq(jobPostings.status, "OPEN")))
    .limit(1);

  if (!job) {
    return err("Job posting not found or is no longer accepting applications.", 404);
  }

  if (isApplicationDeadlinePassed(job.applicationDeadline)) {
    return err("Applications for this position are closed — the deadline has passed.", 400);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? name.trim();
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "-";

  const experienceYearsStr = experienceYears != null ? String(experienceYears) : null;
  const skillsValue = skills && skills.length ? skills : null;
  const educationValue = education && education.length ? education : null;
  const workExperienceValue = workExperience && workExperience.length ? workExperience : null;
  const customLinksValue = customLinks && customLinks.length ? customLinks : null;

  const result = await db.transaction(async (tx) => {
    const identityMatch = phone
      ? or(eq(candidates.email, normalizedEmail), eq(candidates.phone, phone))
      : eq(candidates.email, normalizedEmail);
    const existingCandidate = await tx.query.candidates.findFirst({
      where: and(eq(candidates.orgId, job.orgId), identityMatch),
      columns: { id: true, status: true, updatedAt: true },
    });

    let candidateId: number;
    if (existingCandidate) {
      candidateId = existingCandidate.id;

      const existingApplication = await tx.query.candidateApplications.findFirst({
        where: and(
          eq(candidateApplications.candidateId, candidateId),
          eq(candidateApplications.jobPostingId, jobPostingId),
        ),
        columns: { id: true },
      });
      if (existingApplication) {
        return { error: "You have already applied to this position.", status: 409 } as const;
      }

      if (existingCandidate.status === "REJECTED" && existingCandidate.updatedAt) {
        const updatedAtMs = new Date(existingCandidate.updatedAt).getTime();
        const cooldownEnd = new Date(
          updatedAtMs + REJECTION_COOLDOWN_DAYS * MS_PER_DAY,
        );
        if (Number.isFinite(updatedAtMs) && cooldownEnd > new Date()) {
          const daysLeft = Math.max(
            1,
            Math.ceil((cooldownEnd.getTime() - Date.now()) / MS_PER_DAY),
          );
          return {
            error: `You weren't selected for a previous role. There's a ${REJECTION_COOLDOWN_DAYS}-day waiting period before re-applying — please try again in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
            status: 403,
          } as const;
        }
      }

      const updates: Partial<typeof candidates.$inferInsert> = { updatedAt: new Date() };
      if (phone) updates.phone = phone;
      if (location) updates.location = location;
      if (linkedinUrl) updates.linkedinUrl = linkedinUrl;
      if (githubUrl) updates.githubUrl = githubUrl;
      if (currentRole) updates.currentRole = currentRole;
      if (experienceYearsStr) updates.experienceYears = experienceYearsStr;
      if (skillsValue) updates.skills = skillsValue;
      if (educationValue) updates.education = educationValue;
      if (workExperienceValue) updates.workExperience = workExperienceValue;
      if (customLinksValue) updates.customLinks = customLinksValue;
      if (resumeUrl) updates.resumeUrl = resumeUrl;
      if (existingCandidate.status === "REJECTED") updates.status = "NEW";
      await tx.update(candidates).set(updates).where(eq(candidates.id, candidateId));
    } else {
      const [candidate] = await tx
        .insert(candidates)
        .values({
          orgId: job.orgId,
          firstName,
          lastName,
          email: normalizedEmail,
          phone: phone ?? null,
          location: location ?? null,
          linkedinUrl: linkedinUrl ?? null,
          githubUrl: githubUrl ?? null,
          currentRole: currentRole ?? null,
          experienceYears: experienceYearsStr,
          skills: skillsValue,
          education: educationValue,
          workExperience: workExperienceValue,
          customLinks: customLinksValue,
          resumeUrl: resumeUrl ?? null,
          source: "CAREERS_PAGE",
          status: "NEW",
        })
        .returning({ id: candidates.id });

      if (!candidate) {
        return { error: "Failed to create application. Please try again.", status: 500 } as const;
      }
      candidateId = candidate.id;
    }

    await tx.insert(candidateApplications).values({
      orgId: job.orgId,
      candidateId,
      jobPostingId,
      status: "APPLIED",
      coverLetter: coverLetter ?? null,
    });

    return { candidateId } as const;
  });

  if ("error" in result) {
    return err(result.error ?? "Failed to submit application. Please try again.", result.status);
  }
  const { candidateId } = result;

  void notifyHrRecruitmentEvent(job.orgId, "new_application", {
    jobId: jobPostingId,
    jobTitle: job.title,
    candidateName: name.trim(),
    candidateEmail: normalizedEmail,
    inAppLink: `/hr/recruitment/candidates/${candidateId}`,
  }).catch((error) => {
    logger.error("Failed to send new application notification", error);
  });

  const confirmation = getApplicationConfirmationEmail({
    candidateName: firstName,
    jobTitle: job.title,
  });
  void sendEmail({
    to: normalizedEmail,
    subject: confirmation.subject,
    html: confirmation.html,
  }).catch((error) => {
    logger.error("Failed to send application confirmation email", error);
  });

  return ok({ id: candidateId }, 201);
  } catch (error) {
    logger.error("Careers apply failed", error);
    return err("Failed to submit application. Please try again.", 500);
  }
}
