import { and, eq, isNull } from "drizzle-orm";
import { err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import type { ProjectAction } from "@/lib/projects/project-access";
import type { ProjectRole } from "@/lib/projects/project-roles";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";

type GuardSession = { user: { id: string; role?: string | null }; orgId: string };

export type TicketGuard =
  | {
      ok: true;
      projectId: number;
      role: ProjectRole;
      ticket: { id: number; title: string; assigneeId: string | null; reporterId: string | null; ticketNumber: number };
    }
  | { ok: false; response: ReturnType<typeof err> };

export async function requireTicket(
  session: GuardSession,
  rawProjectId: string,
  rawTicketId: string,
  action: ProjectAction,
): Promise<TicketGuard> {
  const guard = await requireProjectAccess(session, rawProjectId, action);
  if (!guard.ok) return guard;
  const ticketId = parseIdParam(rawTicketId);
  if (ticketId === null) return { ok: false, response: err("Ticket not found", 404) };

  const ticket = await db.query.tickets.findFirst({
    where: and(
      eq(tickets.id, ticketId),
      eq(tickets.projectId, guard.projectId),
      eq(tickets.orgId, session.orgId),
      isNull(tickets.deletedAt),
    ),
    columns: { id: true, title: true, assigneeId: true, reporterId: true, ticketNumber: true },
  });
  if (!ticket) return { ok: false, response: err("Ticket not found", 404) };
  return { ok: true, projectId: guard.projectId, role: guard.role, ticket };
}
