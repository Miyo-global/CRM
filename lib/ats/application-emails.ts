import "server-only";

import { appUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { atsEmailLog } from "@/lib/db/schema";
import { sendTemplateEmail } from "@/lib/email/sender";
import { formatIST } from "@/lib/date-utils";
import { logger } from "@/lib/logger";

interface ApplicationEmailParams {
  candidate: { id: number; firstName: string; lastName: string; email: string };
  job: { id: number; title: string; slug: string | null; location: string | null };
  teamEmails: string[];
  isRepeatCandidate: boolean;
  orgId?: string;
}

/** Record what the ATS sent, so a recruiter can see the candidate's inbox. */
async function logSent(
  orgId: string | undefined,
  candidateId: number,
  templateId: string,
  toEmail: string,
  status: "sent" | "failed",
) {
  if (!orgId) return;
  await db
    .insert(atsEmailLog)
    .values({ orgId, candidateId, templateId, toEmail, status })
    .catch((error) => logger.error("ATS email log failed", { templateId, error }));
}

/**
 * MIYO-0639: the two mails an application sets off — the acknowledgement to
 * the candidate and the heads-up to the hiring team.
 */
export async function sendApplicationEmails(params: ApplicationEmailParams) {
  const { candidate, job, teamEmails } = params;
  const jobUrl = job.slug ? `${appUrl}/careers/${job.slug}` : `${appUrl}/careers`;

  await sendTemplateEmail("ats-application-received", {
    to: candidate.email,
    category: "hr",
    vars: {
      first_name: candidate.firstName,
      job_title: job.title,
      job_location: job.location ?? "not stated",
      job_url: jobUrl,
      applied_on: `${formatIST(new Date(), { day: "numeric", month: "long", year: "numeric" })} IST`,
      review_days: "7",
      privacy_url: `${appUrl}/privacy`,
      withdraw_url: `${appUrl}/careers`,
    },
  });
  await logSent(params.orgId, candidate.id, "ats-application-received", candidate.email, "sent");

  if (teamEmails.length === 0) return;

  await sendTemplateEmail("ats-new-application-internal", {
    to: teamEmails,
    category: "hr",
    vars: {
      candidate_name: `${candidate.firstName} ${candidate.lastName}`.trim(),
      candidate_url: `${appUrl}/ats/candidates/${candidate.id}`,
      job_title: job.title,
      current_company: "not stated",
      experience_years: "not stated",
      source: "Careers site",
      duplicate_hint: params.isRepeatCandidate
        ? "This person has applied before — check their earlier applications."
        : "",
    },
  });
}
