import { inngest } from "../client";
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

/**
 * Daily 08:00 IST greetings for birthdays and work anniversaries (A34).
 *
 * The person celebrating gets an in-app notification and a branded email.
 * Idempotent per person, per kind, per year: the notification carries a
 * celebrationKey and the job skips anyone who already has one.
 */
export const celebrationGreetings = inngest.createFunction(
  {
    id: "celebration-greetings",
    name: "Birthday and Anniversary Greetings",
    // 02:30 UTC is 08:00 IST.
    triggers: { cron: "30 2 * * *" },
  },
  async ({ step }) => {
    const today = isoDateInTimezone();

    const members = await step.run("load-members", async () =>
      db
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
        .where(eq(users.isActive, true)),
    );

    const orgByUser = new Map(members.map((m) => [m.id, m.orgId]));
    const { birthdays, anniversaries } = celebrationsOn(members, today);
    const year = Number(today.slice(0, 4));

    const greeted = await step.run("greet", async () => {
      let sent = 0;
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
            );
          } catch (error) {
            logger.error("Celebration email failed", {
              userId: celebration.userId,
              error: error instanceof Error ? error.message : "Unknown",
            });
          }
        }
        sent++;
      }
      return sent;
    });

    return {
      date: today,
      birthdays: birthdays.length,
      anniversaries: anniversaries.length,
      greeted,
    };
  },
);
