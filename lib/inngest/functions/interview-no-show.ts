import { inngest } from "../client";
import { db } from "@/lib/db";
import { tasks, notifications, organizationMembers, candidates, organizations } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { addDays } from "date-fns";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email/sender";
import { HR_NOTIFICATION_EMAIL } from "@/lib/constants/hr-leave-routing";

const RECRUITMENT_ROLES = ["HR", "BRANCH_HR", "ADMIN"] as const;

export const interviewNoShow = inngest.createFunction(
  {
    id: "interview-no-show",
    name: "Handle Interview No-Show",
    triggers: { event: "hr/interview.no_show" },
  },
  async ({ event, step }) => {
    const { interviewId, candidateId, orgId, candidateName } = event.data;

    await step.run("create-follow-up-task", async () => {
      const hrManagers = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, orgId),
            inArray(organizationMembers.role, [...RECRUITMENT_ROLES]),
          )
        )
        .limit(1);

      const assigneeId = hrManagers[0]?.userId ?? null;

      await db.insert(tasks).values({
        orgId,
        title: `Follow up: No-show — ${candidateName}`,
        notes: `Interview #${interviewId} was marked as a no-show. Please follow up with the candidate to reschedule or close the application.`,
        type: "CALL",
        status: "pending",
        assigneeId,
        createdBy: assigneeId,
        dueDate: addDays(new Date(), 1),
      });

      return { taskCreated: true };
    });

    await step.run("notify-hr", async () => {
      const hrMembers = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.orgId, orgId),
            inArray(organizationMembers.role, [...RECRUITMENT_ROLES]),
          )
        );

      if (hrMembers.length === 0) return { notified: 0 };

      await db.insert(notifications).values(
        hrMembers.map((m) => ({
          orgId,
          userId: m.userId,
          type: "WARNING" as const,
          title: "Interview No-Show",
          message: `${candidateName} did not show up for interview #${interviewId}. A follow-up task has been created.`,
          link: `/hr/recruitment/candidates/${candidateId}`,
        }))
      );

      return { notified: hrMembers.length };
    });

    await step.run("send-reschedule-email", async () => {
      const [candidate, org] = await Promise.all([
        db.query.candidates.findFirst({
          where: eq(candidates.id, candidateId),
          columns: { firstName: true, lastName: true, email: true },
        }),
        db.query.organizations.findFirst({
          where: eq(organizations.id, orgId),
          columns: { name: true },
        }),
      ]);

      if (!candidate?.email) return { sent: false, reason: "no candidate email" };

      const name = `${candidate.firstName} ${candidate.lastName}`.trim();
      const orgName = org?.name ?? "Miyo Global";

      await sendEmail({
        to: candidate.email,
        bcc: HR_NOTIFICATION_EMAIL,
        subject: `We missed you — Would you like to reschedule? | ${orgName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0f2b7f;">We missed you, ${name}!</h2>
            <p>We noticed you were unable to attend your recent interview with <strong>${orgName}</strong>.</p>
            <p>We understand things come up unexpectedly. If you're still interested in the opportunity, we'd be happy to reschedule at a time that works better for you.</p>
            <p>Please reply to this email or contact your recruiter at <a href="mailto:${HR_NOTIFICATION_EMAIL}">${HR_NOTIFICATION_EMAIL}</a> to arrange a new time.</p>
            <p>Best regards,<br/><strong>${orgName} Talent Team</strong></p>
          </div>
        `,
      }).catch((e: unknown) =>
        logger.error("Failed to send no-show reschedule email", { candidateId, error: e })
      );

      return { sent: true };
    });

    await step.run("alert-hr-email", async () => {
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, orgId),
        columns: { name: true },
      });

      const orgName = org?.name ?? "Miyo Global";
      const profileUrl = `${(await import("@/lib/app-url")).appUrl}/hr/recruitment/candidates/${candidateId}`;

      await sendEmail({
        to: HR_NOTIFICATION_EMAIL,
        subject: `Interview No-Show: ${candidateName} — Interview #${interviewId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0f2b7f;">Interview No-Show Alert</h2>
            <p><strong>${candidateName}</strong> did not attend their scheduled interview (#${interviewId}) at <strong>${orgName}</strong>.</p>
            <p>A follow-up task has been created and assigned to the HR team. A reschedule email has also been sent to the candidate.</p>
            <div style="text-align:center;margin:24px 0">
              <a href="${profileUrl}" style="display:inline-block;background:#0f2b7f;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px">View Candidate Profile</a>
            </div>
            <p style="color:#666;font-size:12px;">Recruitment Automation · ${orgName}</p>
          </div>
        `,
      }).catch((e: unknown) =>
        logger.error("Failed to send HR no-show alert email", { candidateId, error: e })
      );

      return { sent: true };
    });

    return { interviewId, candidateId, processed: true };
  }
);
