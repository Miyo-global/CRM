import { inngest } from "../client";
import { db } from "@/lib/db";
import { interviews, candidates, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "@/lib/email/sender";
import { logger } from "@/lib/logger";
import { HR_NOTIFICATION_EMAIL } from "@/lib/constants/hr-leave-routing";
import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "@/lib/constants/locale";

function buildFeedbackEmailHtml(params: {
  candidateName: string;
  orgName: string;
  interviewType: string;
  scheduledAt: Date;
}): { subject: string; html: string } {
  const dateStr = params.scheduledAt.toLocaleString(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIMEZONE,
    dateStyle: "long",
    timeStyle: "short",
  });

  return {
    subject: `How was your interview experience at ${params.orgName}?`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: #0f2b7f; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Thank you for interviewing with us</h1>
        </div>
        <div style="padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Dear ${params.candidateName},</p>
          <p>
            Thank you for taking the time to interview for a position at <strong>${params.orgName}</strong>
            on <strong>${dateStr}</strong>.
          </p>
          <p>We value your perspective and would love to hear about your experience. Your feedback helps us
          continuously improve our hiring process.</p>

          <div style="background: #f8f9fa; border-left: 4px solid #bd882c; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-weight: 600; color: #0f2b7f;">How would you rate your interview experience?</p>
            <p style="margin: 8px 0 0; font-size: 13px; color: #6b7280;">
              Was the process clear and respectful? Did you feel heard? Any suggestions?
            </p>
          </div>

          <div style="text-align: center; margin: 24px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
              <tr>
                <td style="padding: 4px;">
                  <a href="mailto:${HR_NOTIFICATION_EMAIL}?subject=Interview Feedback — Excellent&body=Hi, I would rate my experience as Excellent. (Add your feedback here)" style="display: inline-block; padding: 10px 18px; background: #22c55e; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Excellent</a>
                </td>
                <td style="padding: 4px;">
                  <a href="mailto:${HR_NOTIFICATION_EMAIL}?subject=Interview Feedback — Good&body=Hi, I would rate my experience as Good. (Add your feedback here)" style="display: inline-block; padding: 10px 18px; background: #3b82f6; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Good</a>
                </td>
                <td style="padding: 4px;">
                  <a href="mailto:${HR_NOTIFICATION_EMAIL}?subject=Interview Feedback — Needs Improvement&body=Hi, I would rate my experience as Needs Improvement. (Add your feedback here)" style="display: inline-block; padding: 10px 18px; background: #f59e0b; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Could be better</a>
                </td>
              </tr>
            </table>
          </div>

          <p style="font-size: 13px; color: #6b7280;">
            You can also reply to this email directly with any comments or suggestions.
            We read every response.
          </p>

          <p>Thank you again for your time, and we wish you the very best in your career journey.</p>

          <p>Warm regards,<br/><strong>${params.orgName} Recruitment Team</strong></p>
        </div>
      </div>
    `,
  };
}

export const candidateFeedbackEmail = inngest.createFunction(
  { id: "candidate-feedback-email", name: "Send Candidate Feedback Email After Interview", triggers: { event: "hr/interview.scorecard.submitted" } },
  async ({ event, step }) => {
    const { interviewId, orgId, candidateId } = event.data as {
      interviewId: number;
      orgId: string;
      candidateId: number;
    };

    const result = await step.run("send-feedback-email", async () => {
      const [interview, candidate, org] = await Promise.all([
        db.query.interviews.findFirst({
          where: and(eq(interviews.id, interviewId), eq(interviews.orgId, orgId)),
          columns: { scheduledAt: true, type: true, remindersSent: true },
        }),
        db.query.candidates.findFirst({
          where: eq(candidates.id, candidateId),
          columns: { firstName: true, lastName: true, email: true, status: true },
        }),
        db.query.organizations.findFirst({
          where: eq(organizations.id, orgId),
          columns: { name: true },
        }),
      ]);

      if (!interview || !candidate?.email) {
        return { sent: false, reason: "missing interview or candidate email" };
      }

      if (candidate.status === "HIRED" || candidate.status === "REJECTED") {
        return { sent: false, reason: "candidate already in terminal status" };
      }

      const remindersSent = (interview.remindersSent ?? {}) as Record<string, boolean>;
      if (remindersSent["feedbackSent"]) {
        return { sent: false, reason: "feedback email already sent for this interview" };
      }

      const candidateName = `${candidate.firstName} ${candidate.lastName}`.trim();
      const orgName = org?.name ?? "Miyo Global";

      const { subject, html } = buildFeedbackEmailHtml({
        candidateName,
        orgName,
        interviewType: interview.type ?? "VIDEO",
        scheduledAt: interview.scheduledAt,
      });

      await sendEmail({ to: candidate.email, subject, html }).catch((e) =>
        logger.error("Failed to send candidate feedback email", { interviewId, error: e })
      );

      await db
        .update(interviews)
        .set({ remindersSent: { ...remindersSent, feedbackSent: true }, updatedAt: new Date() })
        .where(eq(interviews.id, interviewId));

      return { sent: true, to: candidate.email };
    });

    return result;
  }
);
