import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketChecklistItems, tickets } from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";

/** MIYO-0111: checklist items on a ticket. */

const addItemSchema = z.object({
  title: z.string().trim().min(1).max(300),
}).strict();

const patchItemSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().trim().min(1).max(300).optional(),
  isDone: z.boolean().optional(),
  position: z.number().int().min(0).max(999).optional(),
}).strict().refine(
  (v) => v.title !== undefined || v.isDone !== undefined || v.position !== undefined,
  { message: "Nothing to update." },
);

type RouteParams = { params: Promise<{ projectId: string; ticketId: string }> };

async function findProjectTicket(ticketId: number, projectId: number, orgId: string) {
  return db.query.tickets.findFirst({
    where: and(
      eq(tickets.id, ticketId),
      eq(tickets.projectId, projectId),
      eq(tickets.orgId, orgId),
      isNull(tickets.deletedAt),
    ),
    columns: { id: true },
  });
}

function listItems(ticketId: number) {
  return db.query.ticketChecklistItems.findMany({
    where: eq(ticketChecklistItems.ticketId, ticketId),
    orderBy: (items, { asc }) => [asc(items.position), asc(items.id)],
    limit: 200,
  });
}

/** Resolve the ticket for this request, or the response that refuses it. */
async function resolveTicket(
  session: { user: { id: string; role?: string | null }; orgId: string },
  params: RouteParams["params"],
  access: "view" | "contribute",
) {
  const { ticketId: rawTicketId, projectId: rawProjectId } = await params;
  const guard = await requireProjectAccess(session, rawProjectId, access);
  if (!guard.ok) return { ok: false as const, response: guard.response };
  const ticketId = parseIdParam(rawTicketId);
  if (ticketId === null) return { ok: false as const, response: err("Not found", 404) };
  if (!(await findProjectTicket(ticketId, guard.projectId, session.orgId)))
    return { ok: false as const, response: err("Ticket not found", 404) };
  return { ok: true as const, ticketId };
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const target = await resolveTicket(session, params, "view");
    if (!target.ok) return target.response;
    return ok(await listItems(target.ticketId));
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const target = await resolveTicket(session, params, "contribute");
    if (!target.ok) return target.response;
    const body = await parseBody(req, addItemSchema);

    const [{ next } = { next: 0 }] = await db
      .select({ next: sql<number>`coalesce(max(${ticketChecklistItems.position}) + 1, 0)` })
      .from(ticketChecklistItems)
      .where(eq(ticketChecklistItems.ticketId, target.ticketId));

    const [created] = await db
      .insert(ticketChecklistItems)
      .values({
        orgId: session.orgId,
        ticketId: target.ticketId,
        title: body.title,
        position: Number(next),
        createdBy: session.user.id,
      })
      .returning();

    return ok(created, 201);
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const target = await resolveTicket(session, params, "contribute");
    if (!target.ok) return target.response;
    const body = await parseBody(req, patchItemSchema);

    const [updated] = await db
      .update(ticketChecklistItems)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.position !== undefined ? { position: body.position } : {}),
        ...(body.isDone !== undefined
          ? {
              isDone: body.isDone,
              completedAt: body.isDone ? new Date() : null,
              completedBy: body.isDone ? session.user.id : null,
            }
          : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ticketChecklistItems.id, body.id),
          eq(ticketChecklistItems.ticketId, target.ticketId),
        ),
      )
      .returning();

    if (!updated) return err("Checklist item not found", 404);
    return ok(updated);
  });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const target = await resolveTicket(session, params, "contribute");
    if (!target.ok) return target.response;

    const itemId = Number(new URL(req.url).searchParams.get("itemId"));
    if (!itemId) return err("itemId query param required.", 400);

    await db
      .delete(ticketChecklistItems)
      .where(
        and(
          eq(ticketChecklistItems.id, itemId),
          eq(ticketChecklistItems.ticketId, target.ticketId),
        ),
      );

    return ok({ success: true });
  });
}
