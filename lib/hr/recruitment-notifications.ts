import "server-only";

import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { sendEmail } from "@/lib/email/sender";
import {
  getRecruitmentHrEmail,
  type RecruitmentEmailEvent,
  type JobRecruitmentEmailParams,
} from "@/lib/email-templates/hr-recruitment";
import { notifyByRoles } from "@/server/actions/create-notification";
import { RECRUITMENT_HR_ROLES, ROLES } from "@/lib/constants/roles";
import { HR_NOTIFICATION_EMAIL } from "@/lib/constants/hr-leave-routing";
import { logger } from "@/lib/logger";
import { formatDeadlineDisplay } from "@/lib/careers/application-deadline";

const HR_EMAIL_ROLES: readonly string[] = [ROLES.HR, ROLES.ADMIN, ROLES.BRANCH_HR];

const CEO_EMAIL_EVENTS = new Set<RecruitmentEmailEvent>([
  "job_published",
  "job_deleted",
]);

async function getRecruitmentEmailRecipients(
  orgId: string,
  event: RecruitmentEmailEvent,
): Promise<string[]> {
  const roles = CEO_EMAIL_EVENTS.has(event)
    ? [...HR_EMAIL_ROLES, ROLES.CEO]
    : HR_EMAIL_ROLES;

  const rows = await db
    .select({ email: users.email })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        inArray(organizationMembers.role, [...roles]),
        eq(users.isActive, true),
      ),
    );

  return [
    ...new Set([
      ...rows.map((r) => r.email).filter(Boolean),
      HR_NOTIFICATION_EMAIL,
    ]),
  ];
}

export async function sendRecruitmentHrEmails(
  orgId: string,
  event: RecruitmentEmailEvent,
  params: JobRecruitmentEmailParams,
) {
  const { subject, html } = getRecruitmentHrEmail(event, params);
  const recipients = await getRecruitmentEmailRecipients(orgId, event);
  if (recipients.length === 0) return;

  const results = await Promise.allSettled(
    recipients.map((to) => sendEmail({ to, subject, html })),
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      logger.error("Recruitment HR email failed for recipient", {
        event,
        recipient: recipients[index],
        error:
          result.reason instanceof Error ? result.reason.message : "Unknown",
      });
    }
  });
}

const IN_APP_COPY: Record<
  RecruitmentEmailEvent,
  (p: JobRecruitmentEmailParams) => { title: string; message: string; link?: string }
> = {
  job_created: (p) => ({
    title: "Job posting created",
    message: `"${p.jobTitle}" was created as a draft.`,
    link: "/hr/recruitment/jobs",
  }),
  job_published: (p) => ({
    title: "Job posting published",
    message: `"${p.jobTitle}" is now live on the careers page.`,
    link: "/hr/recruitment/jobs",
  }),
  job_deleted: (p) => ({
    title: "Job posting deleted",
    message: `"${p.jobTitle}" was permanently removed.`,
    link: "/hr/recruitment/jobs",
  }),
  applications_auto_closed: (p) => ({
    title: "Applications closed automatically",
    message:
      p.closedCount && p.closedCount > 1
        ? `${p.closedCount} job postings were closed because their application deadline passed.`
        : `Applications for "${p.jobTitle}" closed — deadline passed.`,
    link: "/hr/recruitment/jobs",
  }),
  new_application: (p) => ({
    title: "New job application",
    message: `${p.candidateName ?? "A candidate"} applied for "${p.jobTitle}" via the careers page.`,
    link: "/hr/recruitment/candidates",
  }),
};

export async function notifyHrRecruitmentEvent(
  orgId: string,
  event: RecruitmentEmailEvent,
  params: JobRecruitmentEmailParams,
) {
  const formatted: JobRecruitmentEmailParams = {
    ...params,
    applicationDeadline: params.applicationDeadline
      ? formatDeadlineDisplay(params.applicationDeadline) ?? params.applicationDeadline
      : null,
  };

  const copy = IN_APP_COPY[event](formatted);

  try {
    await notifyByRoles(orgId, [...RECRUITMENT_HR_ROLES], {
      type: event === "applications_auto_closed" ? "WARNING" : "INFO",
      title: copy.title,
      message: copy.message,
      link: params.inAppLink ?? copy.link,
      metadata: { jobId: params.jobId, event },
      email: false,
    });
  } catch (error) {
    logger.error("Recruitment in-app notification failed", {
      event,
      error: error instanceof Error ? error.message : "Unknown",
    });
  }

  void sendRecruitmentHrEmails(orgId, event, formatted).catch((error) => {
    logger.error("Recruitment HR email failed", {
      event,
      error: error instanceof Error ? error.message : "Unknown",
    });
  });
}
