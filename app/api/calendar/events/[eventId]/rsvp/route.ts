import { type NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { calendarEvents, eventAttendees } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const rsvpSchema = z.object({
  status: z.enum(["accepted", "declined", "tentative"]),
});

type Ctx = { params: Promise<{ eventId: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { eventId } = await ctx.params;
  const id = Number(eventId);
  if (!Number.isInteger(id) || id <= 0) return err("Invalid event id", 400);

  return withAuth(async (session) => {
    let input: z.infer<typeof rsvpSchema>;
    try {
      input = await parseBody(req, rsvpSchema);
    } catch {
      return err("Invalid request body: status must be accepted, declined, or tentative", 400);
    }

    const event = await db.query.calendarEvents.findFirst({
      where: and(eq(calendarEvents.id, id), eq(calendarEvents.orgId, session.orgId)),
    });
    if (!event) return err("Event not found", 404);

    const invited = Array.isArray(event.attendeeIds) && event.attendeeIds.includes(session.user.id);
    if (!invited && event.createdBy !== session.user.id) {
      return err("You are not invited to this event", 403);
    }

    const [attendee] = await db
      .insert(eventAttendees)
      .values({
        eventId: id,
        userId: session.user.id,
        status: input.status,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [eventAttendees.eventId, eventAttendees.userId],
        set: { status: input.status, updatedAt: new Date() },
      })
      .returning();

    return ok(attendee);
  });
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { eventId } = await ctx.params;
  const id = Number(eventId);
  if (!Number.isInteger(id) || id <= 0) return err("Invalid event id", 400);

  return withAuth(async (session) => {
    const event = await db.query.calendarEvents.findFirst({
      where: and(eq(calendarEvents.id, id), eq(calendarEvents.orgId, session.orgId)),
    });
    if (!event) return err("Event not found", 404);

    const attendees = await db.query.eventAttendees.findMany({
      where: eq(eventAttendees.eventId, id),
      with: {
        user: { columns: { id: true, name: true, email: true, image: true } },
      },
    });

    return ok(attendees);
  });
}
