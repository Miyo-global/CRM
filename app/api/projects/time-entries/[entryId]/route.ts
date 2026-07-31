

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { timesheets, tickets } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { z } from "zod";

const updateEntrySchema = z.object({
  hours: z.number().positive().max(24, "Cannot log more than 24 hours per entry").optional(),
  description: z.string().optional(),
});

type RouteParams = { params: Promise<{ entryId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { entryId } = await params;
    const id = Number(entryId);
    if (!id) return err("Invalid entry id", 400);

    const entry = await db.query.timesheets.findFirst({
      where: and(eq(timesheets.id, id), eq(timesheets.orgId, session.orgId!)),
      with: { ticket: { with: { project: true } } },
    });

    if (!entry) return err("Time entry not found", 404);

    if (entry.status !== "PENDING") {
      return err("Cannot edit a time entry that has already been reviewed", 403);
    }

    const isOwnerOrAdmin = isAdminOrOwner(session.user.role);
    if (!isOwnerOrAdmin && entry.userId !== session.user.id) {
      return err("You can only edit your own time entries", 403);
    }

    const body = await parseBody(req, updateEntrySchema);

    const updateData: { description?: string; hours?: string; updatedAt?: Date } = {
      updatedAt: new Date(),
    };
    if (body.description !== undefined) updateData.description = body.description;
    if (body.hours !== undefined) updateData.hours = body.hours.toString();

    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(timesheets)
        .set(updateData)
        .where(eq(timesheets.id, id))
        .returning();

      if (body.hours !== undefined && entry.ticketId) {
        const totalHours = await tx
          .select({
            total: sql<number>`COALESCE(SUM(${timesheets.hours}::numeric), 0)`,
          })
          .from(timesheets)
          .where(eq(timesheets.ticketId, entry.ticketId));

        await tx
          .update(tickets)
          .set({ timeSpent: totalHours[0]?.total?.toString() ?? "0" })
          .where(eq(tickets.id, entry.ticketId));
      }

      return row;
    });

    return ok(updated);
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { entryId } = await params;
    const id = Number(entryId);
    if (!id) return err("Invalid entry id", 400);

    const entry = await db.query.timesheets.findFirst({
      where: and(eq(timesheets.id, id), eq(timesheets.orgId, session.orgId!)),
    });

    if (!entry) return err("Time entry not found", 404);

    if (entry.status !== "PENDING") {
      return err("Cannot delete a time entry that has already been reviewed", 403);
    }

    const isOwnerOrAdmin = isAdminOrOwner(session.user.role);
    if (!isOwnerOrAdmin && entry.userId !== session.user.id) {
      return err("You can only delete your own time entries", 403);
    }

    const ticketId = entry.ticketId;

    await db.delete(timesheets).where(eq(timesheets.id, id));

    if (ticketId) {
      const totalHours = await db
        .select({
          total: sql<number>`COALESCE(SUM(${timesheets.hours}::numeric), 0)`,
        })
        .from(timesheets)
        .where(eq(timesheets.ticketId, ticketId));

      await db
        .update(tickets)
        .set({ timeSpent: totalHours[0]?.total?.toString() ?? "0" })
        .where(eq(tickets.id, ticketId));
    }

    return ok({ success: true });
  });
}
