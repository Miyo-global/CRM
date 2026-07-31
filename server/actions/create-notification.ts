"use server";

import { db } from "@/lib/db";
import { notifications, organizationMembers, users } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { buildNotificationEmail } from "@/lib/notifications/email";
import { logger } from "@/lib/logger";
import { HR_NOTIFICATION_EMAIL } from "@/lib/constants/hr-leave-routing";

async function emailMemberIds(
  userIds: string[],
  opts: { title: string; message: string; link?: string; extraEmails?: string[] },
) {
  if (userIds.length === 0 && (opts.extraEmails?.length ?? 0) === 0) return;
  try {
    const recipients =
      userIds.length > 0
        ? await db.select({ email: users.email }).from(users).where(inArray(users.id, userIds))
        : [];
    const emails = [
      ...new Set(
        [...recipients.map((r) => r.email), ...(opts.extraEmails ?? [])].filter(
          (e): e is string => !!e,
        ),
      ),
    ];
    if (emails.length === 0) return;
    const { subject, html } = buildNotificationEmail(opts);
    await Promise.allSettled(emails.map((to) => sendEmail({ to, subject, html })));
  } catch (error) {
    logger.error("Failed to email notification recipients", {
      error: error instanceof Error ? error.message : "Unknown",
    });
  }
}

interface CreateNotificationInput {
  orgId: string;
  userId: string;
  type?: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput) {
  const [notification] = await db
    .insert(notifications)
    .values({
      orgId: input.orgId,
      userId: input.userId,
      type: input.type ?? "INFO",
      title: input.title,
      message: input.message,
      link: input.link,
      metadata: input.metadata,
    })
    .returning();

  return notification;
}

export async function notifyAllMembers(
  orgId: string,
  opts: {
    type?: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, unknown>;
    excludeUserId?: string;
    email?: boolean;
  }
) {
  const members = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(eq(organizationMembers.orgId, orgId));

  const targetMembers = opts.excludeUserId
    ? members.filter((m) => m.userId !== opts.excludeUserId)
    : members;

  if (targetMembers.length === 0) return;

  await db.insert(notifications).values(
    targetMembers.map((m) => ({
      orgId,
      userId: m.userId,
      type: opts.type ?? "INFO",
      title: opts.title,
      message: opts.message,
      link: opts.link,
      metadata: opts.metadata,
    }))
  );

  if (opts.email) {
    await emailMemberIds(targetMembers.map((m) => m.userId), opts);
  }
}

export async function notifyByRoles(
  orgId: string,
  roles: string[],
  opts: {
    type?: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, unknown>;
    excludeUserId?: string;
    email?: boolean;
  }
) {
  const members = await db
    .select({ userId: organizationMembers.userId, role: organizationMembers.role })
    .from(organizationMembers)
    .where(eq(organizationMembers.orgId, orgId));

  const targetMembers = members.filter(
    (m) =>
      roles.includes(m.role) &&
      (!opts.excludeUserId || m.userId !== opts.excludeUserId)
  );

  const ccHrInbox = roles.includes("CEO") || roles.includes("HR");

  if (targetMembers.length === 0) {
    if (opts.email !== false && ccHrInbox) {
      await emailMemberIds([], { ...opts, extraEmails: [HR_NOTIFICATION_EMAIL] });
    }
    return;
  }

  await db.insert(notifications).values(
    targetMembers.map((m) => ({
      orgId,
      userId: m.userId,
      type: opts.type ?? "INFO",
      title: opts.title,
      message: opts.message,
      link: opts.link,
      metadata: opts.metadata,
    }))
  );

  if (opts.email !== false) {
    await emailMemberIds(targetMembers.map((m) => m.userId), {
      ...opts,
      extraEmails: ccHrInbox ? [HR_NOTIFICATION_EMAIL] : [],
    });
  }
}
