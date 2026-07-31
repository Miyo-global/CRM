import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { calendarEvents, interviews } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, or } from "drizzle-orm";
import { withAuth, ok, err } from "@/lib/api/helpers";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const idsParam = url.searchParams.get("interviewerIds");

    if (!dateParam || !idsParam) {
      return err("date and interviewerIds are required.", 400);
    }

    const date = new Date(dateParam);
    if (Number.isNaN(date.getTime())) return err("Invalid date.", 400);

    const interviewerIds = idsParam.split(",").filter(Boolean);
    if (interviewerIds.length === 0) return err("At least one interviewer ID required.", 400);

    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const events = await db
      .select({
        id: calendarEvents.id,
        title: calendarEvents.title,
        startDate: calendarEvents.startDate,
        endDate: calendarEvents.endDate,
        allDay: calendarEvents.allDay,
        createdBy: calendarEvents.createdBy,
        attendeeIds: calendarEvents.attendeeIds,
      })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.orgId, session.orgId),
          lte(calendarEvents.startDate, dayEnd),
          gte(calendarEvents.endDate, dayStart)
        )
      );

    const interviewRows = await db
      .select({
        id: interviews.id,
        scheduledAt: interviews.scheduledAt,
        duration: interviews.duration,
        interviewerId: interviews.interviewerId,
      })
      .from(interviews)
      .where(
        and(
          eq(interviews.orgId, session.orgId),
          gte(interviews.scheduledAt, dayStart),
          lte(interviews.scheduledAt, dayEnd)
        )
      );

    const busyMap = new Map<string, { start: string; end: string; title: string }[]>();
    for (const id of interviewerIds) {
      busyMap.set(id, []);
    }

    for (const ev of events) {
      const eventAttendees = ev.attendeeIds ?? [];
      const relevantIds = interviewerIds.filter(
        (id) => id === ev.createdBy || eventAttendees.includes(id)
      );
      for (const uid of relevantIds) {
        busyMap.get(uid)?.push({
          start: ev.startDate.toISOString(),
          end: ev.endDate.toISOString(),
          title: ev.allDay ? `${ev.title} (all day)` : ev.title,
        });
      }
    }

    for (const iv of interviewRows) {
      if (iv.interviewerId && interviewerIds.includes(iv.interviewerId)) {
        const endTime = new Date(iv.scheduledAt.getTime() + (iv.duration ?? 60) * 60_000);
        busyMap.get(iv.interviewerId)?.push({
          start: iv.scheduledAt.toISOString(),
          end: endTime.toISOString(),
          title: "Interview",
        });
      }
    }

    const availability = interviewerIds.map((id) => ({
      interviewerId: id,
      busyBlocks: busyMap.get(id) ?? [],
    }));

    return ok({ date: dateParam, availability });
  });
}
