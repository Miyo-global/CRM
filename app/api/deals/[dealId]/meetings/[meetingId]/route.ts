import { withAuth, ok, err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { dealMeetings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { NextRequest } from "next/server";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  scheduledAt: z.string().optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  attendees: z.array(z.string()).optional(),
  agenda: z.string().max(2000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  actionItems: z.string().max(2000).optional().nullable(),
  recordingLink: z.string().url().optional().nullable().or(z.literal("")),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
});

type Params = { dealId: string; meetingId: string };

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  return withAuth(async (session) => {
    const { dealId: dealIdStr, meetingId: meetingIdStr } = await params;
    const dealId = Number(dealIdStr);
    const meetingId = Number(meetingIdStr);
    if (!Number.isFinite(meetingId) || meetingId <= 0) return err("Invalid meeting ID.", 400);

    const existing = await db.query.dealMeetings.findFirst({
      where: and(
        eq(dealMeetings.id, meetingId),
        eq(dealMeetings.dealId, dealId),
        eq(dealMeetings.orgId, session.orgId)
      ),
    });
    if (!existing) return err("Meeting not found.", 404);

    const body = updateSchema.parse(await req.json());

    const [updated] = await db
      .update(dealMeetings)
      .set({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.scheduledAt !== undefined && { scheduledAt: new Date(body.scheduledAt) }),
        ...(body.durationMinutes !== undefined && { durationMinutes: body.durationMinutes }),
        ...(body.attendees !== undefined && { attendees: body.attendees }),
        ...(body.agenda !== undefined && { agenda: body.agenda }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.actionItems !== undefined && { actionItems: body.actionItems }),
        ...(body.recordingLink !== undefined && { recordingLink: body.recordingLink || null }),
        ...(body.status !== undefined && { status: body.status }),
        updatedAt: new Date(),
      })
      .where(and(eq(dealMeetings.id, meetingId), eq(dealMeetings.orgId, session.orgId)))
      .returning();

    return ok(updated);
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  return withAuth(async (session) => {
    const { dealId: dealIdStr, meetingId: meetingIdStr } = await params;
    const dealId = Number(dealIdStr);
    const meetingId = Number(meetingIdStr);
    if (!Number.isFinite(meetingId) || meetingId <= 0) return err("Invalid meeting ID.", 400);

    const existing = await db.query.dealMeetings.findFirst({
      where: and(
        eq(dealMeetings.id, meetingId),
        eq(dealMeetings.dealId, dealId),
        eq(dealMeetings.orgId, session.orgId)
      ),
      columns: { id: true },
    });
    if (!existing) return err("Meeting not found.", 404);

    await db
      .delete(dealMeetings)
      .where(and(eq(dealMeetings.id, meetingId), eq(dealMeetings.orgId, session.orgId)));

    return ok({ success: true });
  });
}
