import { inngest } from "../client";
import { db } from "@/lib/db";
import { calendarEvents, notifications } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { addMinutes, subMinutes } from "date-fns";
import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "@/lib/constants/locale";

export const eventReminders = inngest.createFunction(
  {
    id: "event-reminders",
    name: "Send Event Reminders (15 min before)",
    triggers: { cron: "*/15 * * * *" },
  },
  async ({ step }) => {
    const results = await step.run("check-upcoming-events", async () => {
      const now = new Date();
      const windowStart = addMinutes(now, 14);
      const windowEnd = addMinutes(now, 16);

      const upcoming = await db.query.calendarEvents.findMany({
        where: and(
          gte(calendarEvents.startDate, windowStart),
          lte(calendarEvents.startDate, windowEnd),
          eq(calendarEvents.reminder15MinSent, false)
        ),
        columns: {
          id: true,
          orgId: true,
          title: true,
          startDate: true,
          attendeeIds: true,
          createdBy: true,
          location: true,
          entityType: true,
          entityId: true,
        },
      });

      let sent = 0;
      for (const event of upcoming) {
        const recipientIds = [
          ...new Set([
            event.createdBy,
            ...(Array.isArray(event.attendeeIds) ? event.attendeeIds : []),
          ]),
        ];

        const startStr = event.startDate.toLocaleTimeString(DEFAULT_LOCALE, {
          timeZone: DEFAULT_TIMEZONE,
          timeStyle: "short",
        });

        await db.insert(notifications).values(
          recipientIds.map((userId) => ({
            orgId: event.orgId,
            userId,
            type: "INFO" as const,
            title: `Upcoming: ${event.title}`,
            message: `Your event starts at ${startStr}${event.location ? ` • ${event.location}` : ""}.`,
            link: `/calendar`,
          }))
        );

        await db
          .update(calendarEvents)
          .set({ reminder15MinSent: true, updatedAt: new Date() })
          .where(eq(calendarEvents.id, event.id));

        sent++;
      }

      return { sent, total: upcoming.length };
    });

    return results;
  }
);
