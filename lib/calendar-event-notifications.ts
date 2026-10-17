"server-only";

import { format } from "date-fns";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, users } from "@/lib/db/schema";
import { sendTemplateEmail } from "@/lib/email/sender";
import { isEmailConfigured } from "@/lib/email/config";
import { appUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";

export interface CalendarEventNotifyResult {
  attendeeCount: number;
  emailsSent: number;
  emailsSkippedNoAddress: number;
  emailFailures: number;
  mailerConfigured: boolean;
  inAppNotifications: number;
}

function formatRange(start: Date, end: Date, allDay: boolean) {
  if (allDay) {
    return `${format(start, "MMM d, yyyy")} (all day)`;
  }
  return `${format(start, "MMM d, yyyy h:mm a")} – ${format(end, "h:mm a")}`;
}

function truncate(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export async function sendCalendarEventAttendeeEmails(params: {
  orgId: string;
  creatorUserId: string;
  attendeeIds: string[];
  title: string;
  description?: string | null;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string | null;
  variant: "created" | "updated";
}): Promise<CalendarEventNotifyResult> {
  const mailerConfigured = isEmailConfigured();
  const ids = [...new Set(params.attendeeIds)].filter(
    (id) => id && id !== params.creatorUserId,
  );

  const empty: CalendarEventNotifyResult = {
    attendeeCount: 0,
    emailsSent: 0,
    emailsSkippedNoAddress: 0,
    emailFailures: 0,
    mailerConfigured,
    inAppNotifications: 0,
  };

  if (ids.length === 0) {
    return empty;
  }

  const [creator, attendees] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, params.creatorUserId),
      columns: { name: true, email: true },
    }),
    db.query.users.findMany({
      where: inArray(users.id, ids),
      columns: { id: true, email: true, name: true },
    }),
  ]);

  const organizer = creator?.name?.trim() || creator?.email || "Someone";
  const when = formatRange(params.startDate, params.endDate, params.allDay);
  const subject =
    params.variant === "updated"
      ? `Calendar update: ${params.title}`
      : `Invitation: ${params.title}`;

  const action = params.variant === "updated" ? "Updated" : "Invitation";
  const actionSentence =
    params.variant === "updated"
      ? `${organizer} updated this event.`
      : `${organizer} invited you to this event.`;

  if (!mailerConfigured) {
    logger.warn("CALENDAR_INVITE_EMAIL_SKIPPED: mail provider not configured", {
      subject,
      attendeeUserIds: ids,
    });
  }

  const emailOutcomes = await Promise.all(
    attendees.map(async (u) => {
      if (!u.email) return "no_address" as const;
      if (!mailerConfigured) return "skipped_mailer" as const;
      try {
        // MIYO-0154: the calendar-event template, rather than hand-built HTML.
        await sendTemplateEmail("calendar-event", {
          to: u.email,
          vars: {
            event_title: params.title,
            event_action: action,
            event_action_sentence: actionSentence,
            event_date: params.allDay
              ? `${format(params.startDate, "MMM d, yyyy")} (all day)`
              : format(params.startDate, "MMM d, yyyy"),
            event_time: params.allDay ? "All day" : when,
            location: params.location?.trim() || "Not given",
            organizer_name: organizer,
          },
        });
        return "sent" as const;
      } catch (err) {
        logger.error("CALENDAR_INVITE_EMAIL_FAILED", {
          to: u.email,
          subject,
          error: err instanceof Error ? err.message : String(err),
        });
        return "failed" as const;
      }
    }),
  );

  const emailsSent = emailOutcomes.filter((o) => o === "sent").length;
  const emailsSkippedNoAddress = emailOutcomes.filter((o) => o === "no_address").length;
  const emailFailures = emailOutcomes.filter((o) => o === "failed").length;

  const inAppTitle =
    params.variant === "updated" ? "Calendar event updated" : "New calendar invitation";
  const verb = params.variant === "updated" ? "updated an event" : "invited you to";
  const inAppMessage = `${organizer} ${verb} "${truncate(params.title, 120)}" · ${when}`;

  let inAppNotifications = 0;
  try {
    await db.insert(notifications).values(
      ids.map((userId) => ({
        orgId: params.orgId,
        userId,
        type: "INFO" as const,
        title: inAppTitle,
        message: inAppMessage,
        link: "/calendar",
        isRead: false,
      })),
    );
    inAppNotifications = ids.length;
  } catch (err) {
    logger.error("CALENDAR_INVITE_IN_APP_FAILED", {
      orgId: params.orgId,
      userIds: ids,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return {
    attendeeCount: ids.length,
    emailsSent,
    emailsSkippedNoAddress,
    emailFailures,
    mailerConfigured,
    inAppNotifications,
  };
}
