

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets, timesheets } from "@/lib/db/schema";
import { eq, and, desc, sql, isNull } from "drizzle-orm";
import { formatDateOnly } from "@/lib/date-utils";
import { z } from "zod";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";

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
}).strict();

type RouteParams = { params: Promise<{ projectId: string; ticketId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId, ticketId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "view");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const id = parseIdParam(ticketId);
    if (id === null) return err("Not found", 404);

    const ticket = await db.query.tickets.findFirst({
      where: and(
        eq(tickets.id, id),
        eq(tickets.projectId, projectId),
        eq(tickets.orgId, session.orgId!),
        isNull(tickets.deletedAt)
      ),
      columns: { id: true },
    });
    if (!ticket) return err("Ticket not found", 404);

    const canSeeAll = guard.role === "OWNER" || guard.role === "MANAGER";

    const entries = await db.query.timesheets.findMany({
      where: and(
        eq(timesheets.ticketId, id),
        eq(timesheets.orgId, session.orgId!),
        ...(canSeeAll ? [] : [eq(timesheets.userId, session.user.id)])
      ),
      orderBy: [desc(timesheets.date)],
      with: { ticket: { with: { project: true } } },
      limit: 100,
    });

    return ok(entries);
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId, ticketId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const id = parseIdParam(ticketId);
    if (id === null) return err("Not found", 404);

    const ticket = await db.query.tickets.findFirst({
      where: and(
        eq(tickets.id, id),
        eq(tickets.projectId, projectId),
        eq(tickets.orgId, session.orgId!),
        isNull(tickets.deletedAt)
      ),
      columns: { id: true },
    });

    if (!ticket) return err("Ticket not found", 404);

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
