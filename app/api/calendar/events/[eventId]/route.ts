import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import {
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarEventForUser,
} from "@/server/queries/calendar";
import { sendCalendarEventAttendeeEmails } from "@/lib/calendar-event-notifications";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";
import { calendarEventTitleSchema } from "@/lib/validations/calendar-event-zod";
import { getCalendarEventRangeError } from "@/lib/validations/calendar-event";

const updateSchema = z.object({
  title: calendarEventTitleSchema.optional(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  allDay: z.boolean().optional(),
  color: z.string().nullable().optional(),
  category: z.string().optional(),
  entityType: z.string().nullable().optional(),
  entityId: z.string().nullable().optional(),
  attendeeIds: z.array(z.string()).optional(),
  agenda: z.string().nullable().optional(),
  postMeetingNotes: z.string().nullable().optional(),
  linkedDealId: z.number().int().nullable().optional(),
  linkedLeadId: z.number().int().nullable().optional(),
});

type Ctx = { params: Promise<{ eventId: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { eventId } = await ctx.params;
  const id = Number(eventId);
  if (!Number.isInteger(id) || id <= 0) return err("Invalid event id", 400);

  return withAuth(async (session) => {
    let input: z.infer<typeof updateSchema>;
    try {
      input = await parseBody(req, updateSchema);
    } catch {
      return err("Invalid request body", 400);
    }

    const updateData: Parameters<typeof updateCalendarEvent>[3] = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description ?? null;
    if (input.location !== undefined) updateData.location = input.location ?? null;
    if (input.startDate !== undefined) updateData.startDate = new Date(input.startDate);
    if (input.endDate !== undefined) updateData.endDate = new Date(input.endDate);
    if (input.allDay !== undefined) updateData.allDay = input.allDay;
    if (input.color !== undefined) updateData.color = input.color ?? null;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.entityType !== undefined) updateData.entityType = input.entityType ?? null;
    if (input.entityId !== undefined) updateData.entityId = input.entityId ?? null;
    if (input.attendeeIds !== undefined) updateData.attendeeIds = input.attendeeIds;
    if (input.agenda !== undefined) updateData.agenda = input.agenda ?? null;
    if (input.postMeetingNotes !== undefined) updateData.postMeetingNotes = input.postMeetingNotes ?? null;
    if (input.linkedDealId !== undefined) updateData.linkedDealId = input.linkedDealId ?? null;
    if (input.linkedLeadId !== undefined) updateData.linkedLeadId = input.linkedLeadId ?? null;

    const isAdmin = isAdminOrOwner(session.user.role);

    const touchesSchedule =
      input.startDate !== undefined ||
      input.endDate !== undefined ||
      input.allDay !== undefined;

    if (touchesSchedule) {
      const existing = await getCalendarEventForUser(id, session.orgId, session.user.id, isAdmin);
      if (!existing) {
        return err("Event not found or not authorized", 404);
      }
      const nextStart = updateData.startDate ?? existing.startDate;
      const nextEnd = updateData.endDate ?? existing.endDate;
      const nextAllDay = input.allDay !== undefined ? input.allDay : Boolean(existing.allDay);
      const rangeErr = getCalendarEventRangeError(nextStart, nextEnd, nextAllDay);
      if (rangeErr) {
        return err(rangeErr, 400);
      }
    }

    const event = await updateCalendarEvent(id, session.orgId, session.user.id, updateData, isAdmin);
    if (!event) return err("Event not found or not authorized", 404);

    const attendeeIds = event.attendeeIds ?? [];
    const shouldNotifyAttendees =
      attendeeIds.length > 0 &&
      (input.title !== undefined ||
        input.startDate !== undefined ||
        input.endDate !== undefined ||
        input.allDay !== undefined ||
        input.attendeeIds !== undefined ||
        input.description !== undefined);

    const notifyResult = shouldNotifyAttendees
      ? await sendCalendarEventAttendeeEmails({
          orgId: session.orgId,
          creatorUserId: session.user.id,
          attendeeIds,
          title: event.title,
          description: event.description,
          startDate: event.startDate,
          endDate: event.endDate,
          allDay: Boolean(event.allDay),
          location: event.location,
          variant: "updated",
        })
      : undefined;

    return notifyResult !== undefined ? ok({ ...event, notify: notifyResult }) : ok(event);
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { eventId } = await ctx.params;
  const id = Number(eventId);
  if (!Number.isInteger(id) || id <= 0) return err("Invalid event id", 400);

  return withAuth(async (session) => {
    const isAdmin = isAdminOrOwner(session.user.role);
    const deleted = await deleteCalendarEvent(id, session.orgId, session.user.id, isAdmin);
    if (!deleted) return err("Event not found or not authorized", 404);
    return ok({ deleted: true });
  });
}
