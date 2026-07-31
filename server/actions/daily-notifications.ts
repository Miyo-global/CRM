"use server";

import { db } from "@/lib/db";
import { users, organizationMembers, organizations, notifications } from "@/lib/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { sendCompanyAnnouncementEmail } from "@/lib/email";
import { notifyAllMembers } from "./create-notification";

export async function sendDailyNotifications() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  let birthdayCount = 0;
  const leaveCount = 0;
  const anniversaryCount = 0;

  try {

    const birthdayUsers = await db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        dateOfBirth: users.dateOfBirth,
      })
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          sql`EXTRACT(MONTH FROM ${users.dateOfBirth}::date) = ${month}`,
          sql`EXTRACT(DAY FROM ${users.dateOfBirth}::date) = ${day}`
        )
      );

    if (birthdayUsers.length === 0) {
      logger.info("No birthdays today");
      return { birthdayCount: 0, leaveCount: 0, anniversaryCount: 0 };
    }

    const orgMembersCache = new Map<string, { email: string; name: string | null }[]>();

    async function getOrgMembers(orgId: string) {
      if (orgMembersCache.has(orgId)) return orgMembersCache.get(orgId)!;
      const members = await db
        .select({ email: users.email, name: users.name })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(and(eq(organizationMembers.orgId, orgId), eq(users.isActive, true)));
      orgMembersCache.set(orgId, members);
      return members;
    }

    for (const birthdayUser of birthdayUsers) {
      const displayName =
        birthdayUser.firstName && birthdayUser.lastName
          ? `${birthdayUser.firstName} ${birthdayUser.lastName}`
          : birthdayUser.name || birthdayUser.email;

      const memberships = await db
        .select({
          orgId: organizationMembers.orgId,
          orgName: organizations.name,
        })
        .from(organizationMembers)
        .innerJoin(
          organizations,
          eq(organizationMembers.orgId, organizations.id)
        )
        .where(eq(organizationMembers.userId, birthdayUser.id));

      for (const membership of memberships) {
        const subject = `Happy Birthday, ${displayName}!`;
        const message = `Today is ${displayName}'s birthday! Wish them a wonderful day!`;

        const alreadySent = await db.query.notifications.findFirst({
          where: and(
            eq(notifications.orgId, membership.orgId),
            gte(notifications.createdAt, new Date(Date.now() - 20 * 60 * 60 * 1000)),
            sql`${notifications.metadata}->>'category' = 'birthday'`,
            sql`${notifications.metadata}->>'birthdayUserId' = ${birthdayUser.id}`,
          ),
          columns: { id: true },
        });
        if (alreadySent) continue;

        try {
          await notifyAllMembers(membership.orgId, {
            type: "INFO",
            title: subject,
            message,
            metadata: {
              category: "birthday",
              birthdayUserId: birthdayUser.id,
            },
          });
        } catch (err) {
          logger.error("Failed to create birthday in-app notifications", {
            userId: birthdayUser.id,
            orgId: membership.orgId,
            error: err,
          });
        }

        try {
          const orgMembers = await getOrgMembers(membership.orgId);

          const emails = orgMembers
            .map((m) => m.email)
            .filter(Boolean) as string[];

          if (emails.length > 0) {
            const emailPromises = emails.map((email) =>
              sendCompanyAnnouncementEmail(
                email,
                subject,
                message,
                membership.orgName || "Miyo Global"
              )
            );
            await Promise.allSettled(emailPromises);
          }
        } catch (err) {
          logger.error("Failed to send birthday emails", {
            userId: birthdayUser.id,
            orgId: membership.orgId,
            error: err,
          });
        }

        birthdayCount++;
      }
    }

    logger.info("Daily notifications processed", {
      birthdayCount,
      leaveCount,
      anniversaryCount,
    });
  } catch (error) {
    logger.error("Failed to process daily notifications", error);
    throw error;
  }

  return { birthdayCount, leaveCount, anniversaryCount };
}
