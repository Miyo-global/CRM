import { inngest } from "../client";
import { db } from "@/lib/db";
import { notifications, users, organizationMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const notificationHandler = inngest.createFunction(
  { id: "notification-handler", name: "Handle Notification Events", triggers: { event: "notification/send" } },
  async ({ event, step }) => {
    const { userId, type, title, message, link, channels = ["in_app"] } = event.data;

    if (channels.includes("in_app")) {
      await step.run("create-in-app-notification", async () => {
        const membership = await db.query.organizationMembers.findFirst({
          where: eq(organizationMembers.userId, userId),
          columns: { orgId: true },
        });

        if (!membership?.orgId) return;

        const notificationType = type === "info" ? "INFO" : type === "warning" ? "WARNING" : type === "error" ? "ERROR" : type === "success" ? "SUCCESS" : "INFO";

        await db.insert(notifications).values({
          orgId: membership.orgId,
          userId,
          type: notificationType as "INFO" | "WARNING" | "ERROR" | "SUCCESS",
          title,
          message,
          link,
          isRead: false,
        });
      });
    }

    if (channels.includes("email")) {
      await step.run("send-email-notification", async () => {
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { email: true, name: true },
        });

        if (user?.email) {
          await inngest.send({
            name: "email/send",
            data: {
              to: user.email,
              subject: title,
              templateId: "notification",
              context: {
                name: user.name || "User",
                title,
                message,
                link: link || "",
              },
            },
          });
        }
      });
    }

    if (channels.includes("push")) {
      await step.run("send-push-notification", async () => {
        const { sendPushToUser } = await import("@/lib/web-push");
        await sendPushToUser(userId, { title, body: message, url: link });
      });
    }

    return { success: true, channels };
  }
);
