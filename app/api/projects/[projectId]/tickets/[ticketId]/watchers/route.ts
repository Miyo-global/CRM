

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketWatchers, tickets, organizationMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { isAdminOrOwner } from "@/lib/auth/role-guards";

type RouteParams = {
  params: Promise<{ projectId: string; ticketId: string }>;
};

async function resolveIds(params: RouteParams["params"]) {
  const { projectId: rawPid, ticketId: tid } = await params;
  return { projectId: Number(rawPid), ticketId: Number(tid) };
}

async function loadTicketForProject(
  projectId: number,
  ticketId: number,
  orgId: string
) {
  if (!projectId || !ticketId) return null;
  return db.query.tickets.findFirst({
    where: and(
      eq(tickets.id, ticketId),
      eq(tickets.orgId, orgId),
      eq(tickets.projectId, projectId),
    ),
    columns: { id: true, reporterId: true, assigneeId: true },
    with: {
      project: { columns: { managerId: true } },
      assignees: { columns: { userId: true } },
    },
  });
}

function canRemoveWatcherForOthers(
  sessionUserId: string,
  role: string | undefined,
  ticket: NonNullable<Awaited<ReturnType<typeof loadTicketForProject>>>
): boolean {
  if (isAdminOrOwner(role)) return true;
  if (ticket.project?.managerId === sessionUserId) return true;
  if (ticket.reporterId === sessionUserId) return true;
  if (ticket.assigneeId === sessionUserId) return true;
  return ticket.assignees.some((a) => a.userId === sessionUserId);
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId, ticketId } = await resolveIds(params);
    if (!ticketId || !projectId) return err("Invalid ticket id", 400);

    const ticket = await loadTicketForProject(
      projectId,
      ticketId,
      session.orgId!
    );
    if (!ticket) return err("Ticket not found", 404);

    const watchers = await db.query.ticketWatchers.findMany({
      where: eq(ticketWatchers.ticketId, ticketId),
      with: { user: true },
    });

    return ok(watchers);
  });
}

const addWatcherSchema = z.object({
  userId: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId, ticketId } = await resolveIds(params);
    if (!ticketId || !projectId) return err("Invalid ticket id", 400);

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
    const { projectId, ticketId } = await resolveIds(params);
    if (!ticketId || !projectId) return err("Invalid ticket id", 400);

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
      !canRemoveWatcherForOthers(session.user.id, session.user.role, ticket)
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
