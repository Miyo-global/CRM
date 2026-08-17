import { inngest } from "../client";
import { sendEmail } from "@/lib/email/sender";
import { appUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import { HR_NOTIFICATION_EMAIL } from "@/lib/constants/hr-leave-routing";
import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "@/lib/constants/locale";

export const offerDeadlineReminder = inngest.createFunction(
  { id: "offer-deadline-reminder", name: "Offer Deadline Reminder (24h)", triggers: { event: "hr/offer.deadline.reminder" } },
  async ({ event }) => {
    const { candidateId, candidateName, candidateEmail, deadline, documentIds, acceptanceToken } = event.data as {
      candidateId: number;
      candidateName: string;
      candidateEmail: string;
      deadline: string;
      documentIds: number[];
      orgId: string;
      acceptanceToken?: string;
    };

    const deadlineDate = new Date(deadline);
    const deadlineStr = deadlineDate.toLocaleString(DEFAULT_LOCALE, {
      timeZone: DEFAULT_TIMEZONE,
      dateStyle: "full",
      timeStyle: "short",
    });

    const hasDocuments = documentIds.length > 0;
    const acceptanceLink = acceptanceToken ? `${appUrl}/offer-acceptance/${acceptanceToken}` : null;

    const actionBlock = hasDocuments
      ? `
        <p style="margin:12px 0">Please review and sign the following document(s) before the deadline:</p>
        <ul style="margin:16px 0;padding-left:24px">
          ${documentIds
            .map(
              (id) =>
                `<li><a href="${appUrl}/api/hr/recruitment/candidates/${candidateId}/documents/${id}/view" style="color:#bd882c">View Document</a></li>`
            )
            .join("\n")}
        </ul>
        ${acceptanceLink ? `<div style="text-align:center;margin:24px 0"><a href="${acceptanceLink}" style="display:inline-block;background:#0f2b7f;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px">Review &amp; Accept Offer</a></div>` : ""}
      `
      : acceptanceLink
      ? `
        <p style="margin:12px 0">Please review and accept your offer before the deadline:</p>
        <div style="text-align:center;margin:24px 0">
          <a href="${acceptanceLink}" style="display:inline-block;background:#0f2b7f;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px">Review &amp; Accept Offer</a>
        </div>
        <p style="font-size:12px;color:#6b7280;text-align:center">Button not working? Copy this link: <a href="${acceptanceLink}" style="color:#bd882c">${acceptanceLink}</a></p>
      `
      : `<p style="margin:12px 0">Please contact your HR representative to complete your offer acceptance before the deadline.</p>`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#0f2b7f">Offer Acceptance Reminder</h2>
        <p>Dear ${candidateName},</p>
        <p>This is a friendly reminder that your offer acceptance deadline is in <strong>24 hours</strong>.</p>
        <p><strong>Deadline:</strong> ${deadlineStr}</p>
        ${actionBlock}
        <p>If you have any questions, please reach out to your HR contact at <a href="mailto:${HR_NOTIFICATION_EMAIL}" style="color:#bd882c">${HR_NOTIFICATION_EMAIL}</a>.</p>
        <p style="color:#666;font-size:12px;margin-top:32px">
          This is an automated reminder from Miyo Global HR system.
        </p>
      </div>
    `;

    try {
      await sendEmail({
        to: candidateEmail,
        bcc: HR_NOTIFICATION_EMAIL,
        subject: "Reminder: Offer Acceptance Deadline in 24 Hours",
        html,
      });
    } catch (e) {
      logger.error("offer-deadline-reminder: failed to send email", { error: e, candidateEmail });
      throw e;
    }
  }
);
