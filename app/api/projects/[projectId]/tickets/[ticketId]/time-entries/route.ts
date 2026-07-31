

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets, timesheets, projectMembers } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { formatDateOnly } from "@/lib/date-utils";
import { z } from "zod";

const logTimeSchema = z.object({
  date: z
    .string()
    .refine((s) => {
      const d = new Date(s);
      return !Number.isNaN(d.getTime()) && d <= new Date();
    }, "Cannot log time for a future date"),
  hours: z.number().positive().max(24, "Cannot log more than 24 hours per entry"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  workLink: z.string().optional(),
});

type RouteParams = { params: Promise<{ projectId: string; ticketId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { ticketId } = await params;
    const id = Number(ticketId);
    if (!id) return err("Invalid ticket id", 400);

    const ticket = await db.query.tickets.findFirst({
      where: and(eq(tickets.id, id), eq(tickets.orgId, session.orgId!)),
      columns: { id: true },
      with: { project: { columns: { managerId: true } } },
    });
    if (!ticket?.project) return err("Ticket not found", 404);

    const canSeeAll =
      isAdminOrOwner(session.user.role) ||
      ticket.project.managerId === session.user.id;

    const entries = await db.query.timesheets.findMany({
      where: and(
        eq(timesheets.ticketId, id),
        eq(timesheets.orgId, session.orgId!),
        ...(canSeeAll ? [] : [eq(timesheets.userId, session.user.id)])
      ),
      orderBy: [desc(timesheets.date)],
      with: { ticket: { with: { project: true } } },
    });

    return ok(entries);
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { ticketId } = await params;
    const id = Number(ticketId);
    if (!id) return err("Invalid ticket id", 400);

    const ticket = await db.query.tickets.findFirst({
      where: and(eq(tickets.id, id), eq(tickets.orgId, session.orgId!)),
      columns: { projectId: true },
      with: { project: { columns: { managerId: true, id: true } } },
    });

    if (!ticket?.project) return err("Ticket not found", 404);

    const isOwnerOrAdmin = isAdminOrOwner(session.user.role);
    const isManager = ticket.project.managerId === session.user.id;

    if (!isOwnerOrAdmin && !isManager) {
      const membership = await db.query.projectMembers.findFirst({
        where: and(
          eq(projectMembers.projectId, ticket.project.id),
          eq(projectMembers.userId, session.user.id)
        ),
      });
      if (!membership) {
        return err("You must be a project member to log time.", 403);
      }
    }

    const body = await parseBody(req, logTimeSchema);

    const entry = await db.transaction(async (tx) => {
      await tx
        .select({ id: tickets.id })
        .from(tickets)
        .where(eq(tickets.id, id))
        .for("update");

      const [inserted] = await tx
        .insert(timesheets)
        .values({
          orgId: session.orgId!,
          userId: session.user.id,
          ticketId: id,
          date: formatDateOnly(new Date(body.date)),
          hours: body.hours.toString(),
          description: body.description ?? null,
          imageUrl: body.imageUrl?.trim() || null,
          workLink: body.workLink?.trim() || null,
        })
        .returning();

      const totalHours = await tx
        .select({
          total: sql<number>`COALESCE(SUM(${timesheets.hours}::numeric), 0)`,
        })
        .from(timesheets)
        .where(eq(timesheets.ticketId, id));

      await tx
        .update(tickets)
        .set({ timeSpent: totalHours[0]?.total?.toString() ?? "0" })
        .where(eq(tickets.id, id));

      return inserted;
    });

    return ok(entry, 201);
  });
}
