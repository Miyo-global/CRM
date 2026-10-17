import "server-only";

import { db } from "@/lib/db";
import { notifications, organizationMembers, users } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { celebrationKey, celebrationsOn, type Celebration } from "@/lib/hr/celebrations";
import { sendCelebrationEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { isoDateInTimezone } from "@/lib/constants/locale";

/** Already greeted this person, for this kind, this year? */
async function alreadyGreeted(orgId: string, key: string): Promise<boolean> {
  const existing = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.orgId, orgId),
        sql`${notifications.metadata}->>'celebrationKey' = ${key}`,
      ),
    )
    .limit(1);
  return existing.length > 0;
}

function greetingFor(celebration: Celebration): { title: string; message: string } {
  if (celebration.type === "birthday") {
    return {
      title: "Happy birthday!",
      message: "The whole team wishes you a great year ahead.",
    };
  }
  const years = celebration.yearsCompleted ?? 1;
  return {
    title: `Happy work anniversary — ${years} ${years === 1 ? "year" : "years"}!`,
    message: "Thank you for the time you have put in with us.",
  };
}

export interface CelebrationGreetingResult {
  date: string;
  birthdays: number;
  anniversaries: number;
  greeted: number;
}

/**
 * Greets today's birthdays and work anniversaries: one in-app notification and
 * one personal email, to the person celebrating only.
 *
 * Shared by the Inngest schedule and the daily-notifications cron so a birthday
 * produces the same personal mail either way, instead of a company-wide
 * announcement blast (QA-0012). Idempotent per person, per kind, per year via
 * the celebrationKey on the notification, so both schedulers can run.
 */
export async function sendCelebrationGreetings(
  today = isoDateInTimezone(),
): Promise<CelebrationGreetingResult> {
  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      dateOfBirth: users.dateOfBirth,
      joiningDate: users.joiningDate,
      orgId: organizationMembers.orgId,
    })
    .from(users)
    .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
    .where(eq(users.isActive, true));

  const orgByUser = new Map(members.map((m) => [m.id, m.orgId]));
  const { birthdays, anniversaries } = celebrationsOn(members, today);
  const year = Number(today.slice(0, 4));

  let greeted = 0;
  for (const celebration of [...birthdays, ...anniversaries]) {
    const orgId = orgByUser.get(celebration.userId);
    if (!orgId) continue;

    const key = celebrationKey(celebration.type, celebration.userId, year);
    if (await alreadyGreeted(orgId, key)) continue;

    const { title, message } = greetingFor(celebration);
    await db.insert(notifications).values({
      orgId,
      userId: celebration.userId,
      type: "SUCCESS",
      title,
      message,
      link: "/dashboard",
      metadata: { celebrationKey: key },
    });

    if (celebration.email) {
      try {
        await sendCelebrationEmail(
          celebration.email,
          celebration.name ?? "there",
          celebration.type,
          celebration.yearsCompleted,
          celebration.joiningDate,
        );
      } catch (error) {
        logger.error("Celebration email failed", {
          userId: celebration.userId,
          error: error instanceof Error ? error.message : "Unknown",
        });
      }
    }
    greeted++;
  }

  return { date: today, birthdays: birthdays.length, anniversaries: anniversaries.length, greeted };
}
