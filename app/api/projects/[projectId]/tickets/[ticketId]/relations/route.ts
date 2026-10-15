

import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { workItemRelations, tickets } from "@/lib/db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";

const RELATION_TYPES = ["blocks", "blocked_by", "duplicate_of", "relates_to"] as const;

const addRelationSchema = z.object({
  relatedTicketId: z.number().int().positive(),
  relationType: z.enum(RELATION_TYPES),
}).strict();

type RouteParams = { params: Promise<{ projectId: string; ticketId: string }> };

async function findProjectTicket(ticketId: number, projectId: number, orgId: string) {
  return db.query.tickets.findFirst({
    where: and(
      eq(tickets.id, ticketId),
      eq(tickets.projectId, projectId),
      eq(tickets.orgId, orgId),
      isNull(tickets.deletedAt)
    ),
    columns: { id: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: RouteParams
) {
  return withAuth(async (session) => {
    const { ticketId: rawTicketId, projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "view");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const ticketId = parseIdParam(rawTicketId);
    if (ticketId === null) return err("Not found", 404);

    if (!(await findProjectTicket(ticketId, projectId, session.orgId!)))
      return err("Ticket not found", 404);

    const relations = await db.query.workItemRelations.findMany({
      where: or(
        eq(workItemRelations.workItemId, ticketId),
        eq(workItemRelations.relatedWorkItemId, ticketId)
      ),
      with: {
        workItem: { columns: { id: true, title: true, ticketNumber: true, status: true, priority: true } },
        relatedWorkItem: { columns: { id: true, title: true, ticketNumber: true, status: true, priority: true } },
      },
      limit: 100,
    });

    const normalized = relations.map((r) => {
      const isSource = r.workItemId === ticketId;
      return {
        id: r.id,
        relationType: r.relationType,
        relatedTicket: isSource ? r.relatedWorkItem : r.workItem,
        direction: isSource ? "outgoing" : "incoming",
      };
    });

    return ok(normalized);
  });
}

export async function POST(
  req: NextRequest,
  { params }: RouteParams
) {
  return withAuth(async (session) => {
    const { ticketId: rawTicketId, projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const ticketId = parseIdParam(rawTicketId);
    if (ticketId === null) return err("Not found", 404);

    if (!(await findProjectTicket(ticketId, projectId, session.orgId!)))
      return err("Ticket not found", 404);

    const body = await parseBody(req, addRelationSchema);

    if (body.relatedTicketId === ticketId) {
      return err("A ticket cannot relate to itself.", 400);
    }

    const relatedTicket = await findProjectTicket(body.relatedTicketId, projectId, session.orgId!);
    if (!relatedTicket) return err("Related ticket not found in this project.", 404);

    const [created] = await db
      .insert(workItemRelations)
      .values({
        workItemId: ticketId,
        relatedWorkItemId: body.relatedTicketId,
        relationType: body.relationType,
      })
      .onConflictDoNothing()
      .returning();

    if (!created) return err("This relation already exists.", 409);

    return ok(created, 201);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
) {
  return withAuth(async (session) => {
    const { ticketId: rawTicketId, projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const ticketId = parseIdParam(rawTicketId);
    if (ticketId === null) return err("Not found", 404);

    if (!(await findProjectTicket(ticketId, projectId, session.orgId!)))
      return err("Ticket not found", 404);

    const relatedId = Number(new URL(req.url).searchParams.get("relatedId"));
    if (!relatedId) return err("relatedId query param required.", 400);

    await db.delete(workItemRelations).where(
      or(
        and(
          eq(workItemRelations.workItemId, ticketId),
          eq(workItemRelations.relatedWorkItemId, relatedId)
        ),
        and(
          eq(workItemRelations.workItemId, relatedId),
          eq(workItemRelations.relatedWorkItemId, ticketId)
        )
      )
    );

    return ok({ success: true });
  });
}
