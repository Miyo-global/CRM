import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { buildNotificationEmail } from "@/lib/notifications/email";

export interface NotificationPayload {
  orgId: string;
  userId: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  title: string;
  message: string;
  link?: string;
  channel?: "in_app" | "email" | "both";
  sound?: boolean;
  metadata?: Record<string, unknown>;
  recipientEmail?: string;
}

const EMAIL_EVENTS = [
  "Lead Assigned",
  "Lead Converted",
  "Client Invested!",
  "Incentive Approved",
  "Target Achieved",
  "SLA Breach",
];

export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  const channel = payload.channel || "in_app";
  const isEmailEvent = EMAIL_EVENTS.some(e => payload.title.includes(e));
  const shouldEmail = channel === "email" || channel === "both" || isEmailEvent;

  try {

    await db.insert(notifications).values({
      orgId: payload.orgId,
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link,
      channel,
      sound: payload.sound ?? isEmailEvent,
      metadata: payload.metadata,
    });

    if (shouldEmail && payload.recipientEmail) {
      try {
        const { subject, html } = buildNotificationEmail({
          title: payload.title,
          message: payload.message,
          link: payload.link,
        });
        await sendEmail({ to: payload.recipientEmail, subject, html });
      } catch (emailErr) {
        logger.error("Notification email failed", { error: emailErr, userId: payload.userId });
      }
    }

    return true;
  } catch (error) {
    logger.error("Failed to send notification", { error, userId: payload.userId });
    return false;
  }
}
