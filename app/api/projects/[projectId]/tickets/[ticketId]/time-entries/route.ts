

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, isUniqueViolation } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets, timesheets } from "@/lib/db/schema";
import { eq, and, desc, sql, isNull } from "drizzle-orm";
import { getTodayString, isDateOnly } from "@/lib/date-utils";
import { z } from "zod";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";

const logTimeSchema = z.object({
  // A calendar date, compared with the org-timezone today. `new Date(s) <=
  // new Date()` read "2026-10-24" as UTC midnight, which is still in the
  // future at 15:55 New York on the 23rd, so every ticket-panel log failed
  // (R3-PRJ-01).
  date: z
    .string()
    .refine(isDateOnly, "Date must be a calendar date (YYYY-MM-DD)")
    .refine((s) => s <= getTodayString(), "Cannot log time for a future date"),
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

    let entry;
    try {
      entry = await db.transaction(async (tx) => {
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
            date: body.date,
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
    } catch (e) {
      // One entry per person per ticket per day (uq_timesheets_org_user_date_ticket).
      // This used to surface as an empty 500 (R3-PRJ-04).
      if (isUniqueViolation(e)) {
        return err(
          `You already logged time on this ticket for ${body.date}. Edit that entry on Timesheets instead.`,
          409,
        );
      }
      throw e;
    }

    return ok(entry, 201);
  });
}
