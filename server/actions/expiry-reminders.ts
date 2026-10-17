import "server-only";

import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, organizationMembers, organizations, users } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import {
  getTodayString,
  addDays,
  formatDateOnly,
  formatDisplayDate,
  fromISODateString,
} from "@/lib/date-utils";
import { sendDocumentExpiryReminderEmail } from "@/lib/email/hr-documents";
import { sendPasswordExpiryWarningEmail } from "@/lib/email/auth";

/**
 * MIYO-0156: the document-expiry and password-expiry senders existed but
 * nothing called them. This job does, once a day.
 *
 * Reminders go out on fixed days before expiry rather than every day, so a
 * document expiring in a month produces three mails, not thirty.
 */
const DOCUMENT_NOTICE_DAYS = [30, 7, 1];
const PASSWORD_NOTICE_DAYS = [7, 1];

export async function sendExpiryReminders(): Promise<{
  documentReminders: number;
  passwordReminders: number;
}> {
  const today = getTodayString();
  const documentReminders = await remindExpiringDocuments(today);
  const passwordReminders = await remindExpiringPasswords(today);
  return { documentReminders, passwordReminders };
}

async function remindExpiringDocuments(today: string): Promise<number> {
  const targetDates = DOCUMENT_NOTICE_DAYS.map((days) =>
    formatDateOnly(addDays(new Date(`${today}T00:00:00Z`), days)),
  );

  const rows = await db
    .select({
      name: documents.name,
      type: documents.type,
      expiryDate: documents.expiryDate,
      email: users.email,
      userName: users.name,
      firstName: users.firstName,
    })
    .from(documents)
    .innerJoin(users, eq(users.id, documents.userId))
    .where(
      and(
        isNotNull(documents.expiryDate),
        inArray(documents.expiryDate, targetDates),
        eq(users.isActive, true),
      ),
    );

  let sent = 0;
  for (const row of rows) {
    if (!row.email || !row.expiryDate) continue;
    const daysRemaining = Math.round(
      (Date.parse(`${row.expiryDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
    );
    try {
      await sendDocumentExpiryReminderEmail(row.email, row.name, row.expiryDate, daysRemaining);
      sent++;
    } catch (error) {
      logger.error("Document expiry reminder failed", { email: row.email, error });
    }
  }
  return sent;
}

async function remindExpiringPasswords(today: string): Promise<number> {
  const orgs = await db
    .select({ id: organizations.id, passwordExpiryDays: organizations.passwordExpiryDays })
    .from(organizations)
    .where(isNotNull(organizations.passwordExpiryDays));

  let sent = 0;
  for (const org of orgs) {
    const expiryDays = org.passwordExpiryDays;
    if (!expiryDays || expiryDays <= 0) continue;

    for (const notice of PASSWORD_NOTICE_DAYS) {
      // The password set exactly (expiryDays - notice) days ago expires in
      // `notice` days.
      const changedOn = formatDateOnly(
        addDays(new Date(`${today}T00:00:00Z`), -(expiryDays - notice)),
      );

      const rows = await db
        .select({ email: users.email, name: users.name, firstName: users.firstName })
        .from(users)
        .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
        .where(
          and(
            eq(organizationMembers.orgId, org.id),
            eq(users.isActive, true),
            isNotNull(users.passwordChangedAt),
            sql`date(${users.passwordChangedAt} at time zone 'Asia/Kolkata') = ${changedOn}`,
          ),
        );

      // The password expires `notice` days from today.
      const expiresOn = formatDisplayDate(
        fromISODateString(formatDateOnly(addDays(new Date(`${today}T00:00:00Z`), notice))),
        { day: "numeric", month: "long", year: "numeric" },
      );

      for (const row of rows) {
        if (!row.email) continue;
        try {
          await sendPasswordExpiryWarningEmail(row.email, expiresOn);
          sent++;
        } catch (error) {
          logger.error("Password expiry reminder failed", { email: row.email, error });
        }
      }
    }
  }
  return sent;
}
