import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { oneOnOneMeetings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { updateOneOnOneSchema } from "@/lib/validations/hr";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import type { NextRequest } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  return withAuth(async (session) => {
    const { meetingId: id } = await params;
    const meetingId = Number(id);
    if (!meetingId) return err("Invalid meeting ID.", 400);

    const existing = await db.query.oneOnOneMeetings.findFirst({
      where: and(eq(oneOnOneMeetings.id, meetingId), eq(oneOnOneMeetings.orgId, session.orgId)),
    });
    if (!existing) return err("Meeting not found.", 404);

    if (
      existing.managerId !== session.user.id &&
      existing.employeeId !== session.user.id &&
      !isAdminOrOwner(session.user.role)
    ) {
      return err("You do not have permission to modify this meeting.", 403);
    }

    const body = await parseBody(req, updateOneOnOneSchema);
    await db.update(oneOnOneMeetings).set({
      ...(body.scheduledAt !== undefined && { scheduledAt: new Date(body.scheduledAt) }),
      ...(body.duration !== undefined && { duration: body.duration }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.actionItems !== undefined && { actionItems: body.actionItems }),
      ...(body.agenda !== undefined && { agenda: body.agenda }),
      ...(body.meetingLink !== undefined && { meetingLink: body.meetingLink }),
      updatedAt: new Date(),
    }).where(eq(oneOnOneMeetings.id, meetingId));

    return ok({ success: true });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  return withAuth(async (session) => {
    const { meetingId: id } = await params;
    const meetingId = Number(id);
    if (!meetingId) return err("Invalid meeting ID.", 400);

    const existing = await db.query.oneOnOneMeetings.findFirst({
      where: and(eq(oneOnOneMeetings.id, meetingId), eq(oneOnOneMeetings.orgId, session.orgId)),
    });
    if (!existing) return err("Meeting not found.", 404);

    if (
      existing.managerId !== session.user.id &&
      existing.employeeId !== session.user.id &&
      !isAdminOrOwner(session.user.role)
    ) {
      return err("You do not have permission to delete this meeting.", 403);
    }

    await db.delete(oneOnOneMeetings).where(
      and(eq(oneOnOneMeetings.id, meetingId), eq(oneOnOneMeetings.orgId, session.orgId))
    );
    return ok({ success: true });
  });
}
