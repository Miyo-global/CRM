

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketWatchers, tickets, organizationMembers } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";
import type { ProjectRole } from "@/lib/projects/project-roles";

type RouteParams = {
  params: Promise<{ projectId: string; ticketId: string }>;
};

async function loadTicketForProject(
  projectId: number,
  ticketId: number,
  orgId: string
) {
  return db.query.tickets.findFirst({
    where: and(
      eq(tickets.id, ticketId),
      eq(tickets.orgId, orgId),
      eq(tickets.projectId, projectId),
      isNull(tickets.deletedAt),
    ),
    columns: { id: true, reporterId: true, assigneeId: true },
    with: {
      assignees: { columns: { userId: true } },
    },
  });
}

function canRemoveWatcherForOthers(
  sessionUserId: string,
  role: ProjectRole,
  ticket: NonNullable<Awaited<ReturnType<typeof loadTicketForProject>>>
): boolean {
  if (role === "OWNER" || role === "MANAGER") return true;
  if (ticket.reporterId === sessionUserId) return true;
  if (ticket.assigneeId === sessionUserId) return true;
  return ticket.assignees.some((a) => a.userId === sessionUserId);
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawPid, ticketId: tid } = await params;
    const guard = await requireProjectAccess(session, rawPid, "view");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const ticketId = parseIdParam(tid);
    if (ticketId === null) return err("Not found", 404);

    const ticket = await loadTicketForProject(
      projectId,
      ticketId,
      session.orgId!
    );
    if (!ticket) return err("Ticket not found", 404);

    const watchers = await db.query.ticketWatchers.findMany({
      where: eq(ticketWatchers.ticketId, ticketId),
      with: { user: { columns: { id: true, name: true, email: true, image: true } } },
      limit: 100,
    });

    return ok(watchers);
  });
}

const addWatcherSchema = z.object({
  userId: z.string().optional(),
}).strict();

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawPid, ticketId: tid } = await params;
    const guard = await requireProjectAccess(session, rawPid, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;
    const ticketId = parseIdParam(tid);
    if (ticketId === null) return err("Not found", 404);

    const ticket = await loadTicketForProject(
      projectId,
      ticketId,
      session.orgId!
    );
    if (!ticket) return err("Ticket not found", 404);

    const body = await parseBody(req, addWatcherSchema);
    const userId = body.userId ?? session.user.id;

    if (userId !== session.user.id) {
      const member = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.orgId, session.orgId!),
        ),
        columns: { id: true },
      });
      if (!member) return err("User not found in organization", 400);
    }

    await db
      .insert(ticketWatchers)
      .values({ ticketId, userId })
      .onConflictDoNothing();

    return ok({ success: true }, 201);
  });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawPid, ticketId: tid } = await params;
    const guard = await requireProjectAccess(session, rawPid, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId, role } = guard;
    const ticketId = parseIdParam(tid);
    if (ticketId === null) return err("Not found", 404);

    const rawTarget = req.nextUrl.searchParams.get("userId");
    const targetUserId = rawTarget?.trim() || session.user.id;

    const ticket = await loadTicketForProject(
      projectId,
      ticketId,
      session.orgId!
    );
    if (!ticket) return err("Ticket not found", 404);

    if (
      targetUserId !== session.user.id &&
      !canRemoveWatcherForOthers(session.user.id, role, ticket)
    ) {
      return err("Forbidden", 403);
    }

    await db
      .delete(ticketWatchers)
      .where(
        and(
          eq(ticketWatchers.ticketId, ticketId),
          eq(ticketWatchers.userId, targetUserId),
        ),
      );

    return ok({ success: true });
  });
}
