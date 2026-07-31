import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseQuery } from "@/lib/api/helpers";
import {
  getCalendarEvents,
  createCalendarEvent,
  getOooConflicts,
} from "@/server/queries/calendar";
import { sendCalendarEventAttendeeEmails } from "@/lib/calendar-event-notifications";
import { z } from "zod";
import { calendarEventTitleSchema } from "@/lib/validations/calendar-event-zod";
import { getCalendarEventRangeError } from "@/lib/validations/calendar-event";

const getSchema = z.object({
  start: z.string(),
  end: z.string(),
});

const postSchema = z
  .object({
    title: calendarEventTitleSchema,
    description: z.string().optional(),
    location: z.string().optional(),
    startDate: z.string(),
    endDate: z.string(),
    allDay: z.boolean().optional(),
    color: z.string().optional(),
    category: z.string().default("general"),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    attendeeIds: z.array(z.string()).optional(),
    agenda: z.string().optional(),
    linkedDealId: z.number().int().optional(),
    linkedLeadId: z.number().int().optional(),
  })
  .superRefine((data, ctx) => {
    const msg = getCalendarEventRangeError(
      new Date(data.startDate),
      new Date(data.endDate),
      data.allDay ?? false
    );
    if (msg) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: msg,
        path: ["endDate"],
      });
    }
  });

export async function GET(req: NextRequest) {
  return withAuth(async (session) => {
    let params: z.infer<typeof getSchema>;
    try {
      params = parseQuery(req, getSchema);
    } catch {
      return err("Invalid query params: start and end are required", 400);
    }

    const rangeStart = new Date(params.start);
    const rangeEnd = new Date(params.end);

    if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
      return err("Invalid start or end date", 400);
    }

    if (rangeEnd < rangeStart) {
      return err("End date must be on or after start date", 400);
    }

    const maxWindowMs = 366 * 24 * 60 * 60 * 1000;
    if (rangeEnd.getTime() - rangeStart.getTime() > maxWindowMs) {
      return err("Date range too large. Maximum window is 366 days", 400);
    }

    try {
      const events = await getCalendarEvents(
        session.orgId,
        session.user.id,
        rangeStart,
        rangeEnd
      );
      return ok(events);
    } catch (error) {
      return err(
        error instanceof Error ? error.message : "Failed to load calendar events",
        500
      );
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (session) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return err("Invalid request body", 400);
    }
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid request body";
      return err(msg, 400);
    }
    const input = parsed.data;

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    const [event, oooConflicts] = await Promise.all([
      createCalendarEvent({
        orgId: session.orgId,
        createdBy: session.user.id,
        title: input.title,
        description: input.description ?? null,
        location: input.location ?? null,
        startDate,
        endDate,
        allDay: input.allDay ?? false,
        color: input.color ?? "blue",
        category: input.category,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        attendeeIds: input.attendeeIds ?? [],
        agenda: input.agenda ?? null,
        linkedDealId: input.linkedDealId ?? null,
        linkedLeadId: input.linkedLeadId ?? null,
      }),
      getOooConflicts(session.orgId, input.attendeeIds ?? [], startDate, endDate),
    ]);

    const notify = await sendCalendarEventAttendeeEmails({
      orgId: session.orgId,
      creatorUserId: session.user.id,
      attendeeIds: input.attendeeIds ?? [],
      title: input.title,
      description: input.description ?? null,
      startDate,
      endDate,
      allDay: input.allDay ?? false,
      location: input.location ?? null,
      variant: "created",
    });

    return ok({ event, oooConflicts, notify }, 201);
  });
}
