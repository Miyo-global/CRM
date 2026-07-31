import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { teamEvents, teamEventParticipants } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { NextRequest } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return withAuth(async (session) => {
    const { eventId: id } = await params;
    const eventId = Number(id);
    if (!eventId) return err("Invalid event ID.", 400);

    const event = await db.query.teamEvents.findFirst({
      where: and(eq(teamEvents.id, eventId), eq(teamEvents.orgId, session.orgId)),
      with: { participants: true },
    });
    if (!event) return err("Event not found.", 404);

    const alreadyJoined = event.participants?.some((p) => p.userId === session.user.id);
    if (alreadyJoined) return err("Already registered.", 409);

    if (event.maxParticipants && (event.participants?.length ?? 0) >= event.maxParticipants) {
      return err("Event is full.", 400);
    }

    const [participant] = await db.insert(teamEventParticipants).values({
      eventId,
      userId: session.user.id,
      status: "GOING",
    }).returning();

    return ok(participant, 201);
  });
}
