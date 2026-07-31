"use server";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { holidays, organizationMembers, users,  } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendBulkHolidayAnnouncement } from "@/lib/email";
import { ROLES } from "@/lib/constants/roles";
import { formatDateOnly } from "@/lib/date-utils";
import {
  formatHolidayReminderDate,
  getTomorrowDateString,
  isHolidayTomorrow,
} from "@/lib/hr/holiday-reminders";

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function addHoliday(data: {
  name: string;
  date: Date;
  message?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member || (member.role !== ROLES.ADMIN && member.role !== ROLES.CEO)) {
    return { error: "Permission denied" };
  }

  try {
    await db.insert(holidays).values({
      orgId: member.orgId,
      name: capitalizeWords(data.name),
      date: formatDateOnly(data.date),
      message: data.message,
      notificationSent: false,
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (e) {
    return { error: "Failed to add holiday" };
  }
}

export async function getHolidays() {
  const session = await auth();
  if (!session?.user?.id) return [];

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member) return [];

  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;

  return await db.query.holidays.findMany({
    where: and(
      eq(holidays.orgId, member.orgId),
      gte(holidays.date, startDate),
      lte(holidays.date, endDate)
    ),
    orderBy: (holidays, { asc }) => [asc(holidays.date)],
  });
}

export async function deleteHoliday(holidayId: number) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member || (member.role !== ROLES.ADMIN && member.role !== ROLES.CEO)) {
    return { error: "Permission denied" };
  }

  try {
    await db.delete(holidays).where(and(eq(holidays.id, holidayId), eq(holidays.orgId, member.orgId)));
    revalidatePath("/settings");
    return { success: true };
  } catch (e) {
    return { error: "Failed to delete holiday" };
  }
}
export async function sendHolidayReminderIfDue(holidayId: number) {
  const holiday = await db.query.holidays.findFirst({
    where: eq(holidays.id, holidayId),
  });
  if (!holiday || holiday.notificationSent || !isHolidayTomorrow(holiday.date)) {
    return { sent: false };
  }
  await deliverHolidayReminder(holiday);
  return { sent: true };
}

async function deliverHolidayReminder(holiday: {
  id: number;
  orgId: string;
  name: string;
  date: string;
  message: string | null;
}) {
  const members = await db
    .select({
      userId: organizationMembers.userId,
      email: users.email,
      name: users.name,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(
      and(
        eq(organizationMembers.orgId, holiday.orgId),
        eq(users.isActive, true),
      ),
    );

  const emails = members
    .map((m) => m.email)
    .filter((email): email is string => !!email);

  if (emails.length > 0) {
    await sendBulkHolidayAnnouncement(
      emails,
      holiday.name,
      formatHolidayReminderDate(holiday.date),
      holiday.message || undefined,
    );
  }

  await db
    .update(holidays)
    .set({ notificationSent: true })
    .where(eq(holidays.id, holiday.id));
}

export async function sendHolidayNotifications() {
  try {
    const tomorrowDate = getTomorrowDateString();
    const upcomingHolidays = await db.query.holidays.findMany({
      where: and(
        eq(holidays.date, tomorrowDate),
        eq(holidays.notificationSent, false),
      ),
    });

    for (const holiday of upcomingHolidays) {
      await deliverHolidayReminder(holiday);
    }

    return { success: true, count: upcomingHolidays.length };
  } catch (error) {
    logger.error("Failed to send holiday notifications", error);
    return { error: "Failed to send notifications" };
  }
}
export async function bulkAddHolidays(holidayList: Array<{
  name: string;
  date: string;
  message?: string;
}>) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const member = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, session.user.id),
  });

  if (!member || (member.role !== ROLES.ADMIN && member.role !== ROLES.CEO)) {
    return { error: "Permission denied" };
  }

  try {
    const holidayRecords = holidayList.map(h => ({
      orgId: member.orgId,
      name: capitalizeWords(h.name),
      date: h.date,
      message: h.message,
      notificationSent: false,
    }));

    await db.insert(holidays).values(holidayRecords);

    revalidatePath("/settings");
    return { success: true, count: holidayList.length };
  } catch (error) {
    logger.error("Failed to import holidays", error);
    return { error: "Failed to import holidays" };
  }
}

