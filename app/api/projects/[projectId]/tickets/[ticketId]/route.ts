import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  tickets,
  ticketAssignees,
  ticketComments,
  ticketAttachments,
  ticketLabelMappings,
  workItemRelations,
  projectMilestones,
  intakeItems,
  timesheets,
} from "@/lib/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { z } from "zod";
import { parseIdParam, requireProjectAccess } from "@/lib/projects/require-project-access";
import { diffTicketActivity, recordTicketActivity } from "@/lib/projects/record-ticket-activity";
import { allOrgMembers } from "@/lib/projects/assignable-users";
import { notifyTicketUpdate } from "@/lib/projects/ticket-update-notifications";
import { ticketConflict, ticketResponseColumns, userColumns } from "@/lib/projects/ticket-columns";

const updateTicketSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().nullable().optional(),
  type: z.string().max(40).optional(),
  status: z.string().min(1).max(80).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().max(200).optional(),
  assigneeIds: z.array(z.string().max(200)).max(50).optional(),
  sprintId: z.number().int().positive().nullable().optional(),
  epicId: z.number().int().positive().nullable().optional(),
  // MIYO-0114: the release this ticket ships in.
  milestoneId: z.number().int().positive().nullable().optional(),
  points: z.number().int().min(0).max(1000).nullable().optional(),
  originalEstimate: z.number().min(0).nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
  startDate: z.string().date().nullable().optional(),
  clientVisible: z.boolean().optional(),
  version: z.number().int().positive().optional(),
}).strict();

type RouteParams = { params: Promise<{ projectId: string; ticketId: string }> };

function normalizeType(type: string) {
  const upper = type.toUpperCase();
  return upper === "FEATURE" ? "STORY" : upper;
}

function clearedAssignee(value: string) {
  return value === "" || value === "unassigned" ? null : value;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId, ticketId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "view");
    if (!guard.ok) return guard.response;
    const id = parseIdParam(ticketId);
    if (id === null) return err("Ticket not found", 404);

    const ticket = await db.query.tickets.findFirst({
      where: and(eq(tickets.id, id), eq(tickets.projectId, guard.projectId), eq(tickets.orgId, session.orgId), isNull(tickets.deletedAt)),
      with: {
        project: { columns: { id: true, name: true, key: true, managerId: true } },
        sprint: true,
        assignee: { columns: userColumns },
        reporter: { columns: userColumns },
        assignees: { with: { user: { columns: userColumns } } },
        comments: {
          where: isNull(ticketComments.deletedAt),
          with: {
            user: { columns: userColumns },
            reactions: { columns: { emoji: true, userId: true } },
          },
          orderBy: [desc(ticketComments.createdAt)],
          limit: 100,
        },
        attachments: { with: { uploader: { columns: userColumns } } },
        labels: { with: { label: true } },
      },
    });

    if (!ticket) return err("Ticket not found", 404);
    return ok({ ...ticket, canEdit: guard.role !== "VIEWER" });
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId, ticketId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "contribute");
    if (!guard.ok) return guard.response;
    const id = parseIdParam(ticketId);
    if (id === null) return err("Ticket not found", 404);
    const { projectId } = guard;

    const body = await parseBody(req, updateTicketSchema);

    const scope = and(eq(tickets.id, id), eq(tickets.projectId, projectId), eq(tickets.orgId, session.orgId), isNull(tickets.deletedAt));
    const before = await db.query.tickets.findFirst({ where: scope, columns: ticketResponseColumns });
    if (!before) return err("Ticket not found", 404);

    if (body.version !== undefined && body.version !== before.version) {
      return ticketConflict(before.version);
    }

    const nextAssignee = body.assigneeId !== undefined ? clearedAssignee(body.assigneeId) : undefined;
    const assigneeSet = new Set(body.assigneeIds ?? []);
    if (nextAssignee) assigneeSet.add(nextAssignee);
    if (!(await allOrgMembers(session.orgId, assigneeSet))) {
      return err("Assignee must be a member of this organization", 400);
    }

    // MIYO-0114: a ticket can only ship in a release of its own project.
    if (body.milestoneId) {
      const milestone = await db.query.projectMilestones.findFirst({
        where: and(
          eq(projectMilestones.id, body.milestoneId),
          eq(projectMilestones.projectId, projectId),
          eq(projectMilestones.orgId, session.orgId),
        ),
        columns: { id: true },
      });
      if (!milestone) return err("Release not found in this project", 400);
    }

    const updateFields: Partial<typeof tickets.$inferInsert> = { updatedAt: new Date() };
    if (body.title !== undefined) updateFields.title = body.title;
    if (body.description !== undefined) updateFields.description = body.description;
    if (body.type !== undefined) updateFields.type = normalizeType(body.type);
    if (body.status !== undefined) updateFields.status = body.status;
    if (body.priority !== undefined) updateFields.priority = body.priority;
    if (nextAssignee !== undefined) updateFields.assigneeId = nextAssignee;
    if (body.sprintId !== undefined) updateFields.sprintId = body.sprintId;
    if (body.epicId !== undefined) updateFields.epicId = body.epicId;
    if (body.milestoneId !== undefined) updateFields.milestoneId = body.milestoneId;
    if (body.points !== undefined) updateFields.points = body.points;
    if (body.originalEstimate !== undefined) updateFields.originalEstimate = body.originalEstimate?.toString() ?? null;
    if (body.dueDate !== undefined) updateFields.dueDate = body.dueDate;
    if (body.startDate !== undefined) updateFields.startDate = body.startDate;
    if (body.clientVisible !== undefined) updateFields.clientVisible = body.clientVisible;

    const versionScope = body.version !== undefined ? and(scope, eq(tickets.version, body.version)) : scope;
    const [after] = await db.update(tickets).set(updateFields).where(versionScope).returning(ticketReturning());
    if (!after) {
      const current = await db.query.tickets.findFirst({ where: scope, columns: { version: true } });
      if (!current) return err("Ticket not found", 404);
      return ticketConflict(current.version);
    }

    if (body.assigneeIds !== undefined || nextAssignee !== undefined) {
      await db.delete(ticketAssignees).where(eq(ticketAssignees.ticketId, id));
      if (assigneeSet.size > 0) {
        await db.insert(ticketAssignees).values(
          [...assigneeSet].map((userId) => ({ ticketId: id, userId, assignedBy: session.user.id })),
        );
      }
    }

    await recordTicketActivity(
      { orgId: session.orgId, projectId, ticketId: id, actorId: session.user.id },
      diffTicketActivity(before, pickChanged(after, body)),
    );

    // MIYO-0122: a status change is a move, anything else an update.
    void import("@/lib/inngest/dispatch-webhook").then(({ dispatchWebhook }) =>
      dispatchWebhook(
        session.orgId,
        body.status !== undefined && body.status !== before.status ? "ticket.moved" : "ticket.updated",
        {
          ticketId: id,
          projectId,
          title: after.title,
          status: after.status,
          fromStatus: before.status,
          assigneeId: after.assigneeId,
        },
      ),
    );

    void notifyTicketUpdate({
      orgId: session.orgId,
      ticketId: id,
      actorId: session.user.id,
      actorName: session.user.name,
      assigneeId: body.assigneeId,
      assigneeIds: body.assigneeIds,
      status: body.status,
    }).catch(() => {});

    return ok({ success: true, ticket: after });
  });
}

function ticketReturning() {
  return {
    id: tickets.id,
    version: tickets.version,
    title: tickets.title,
    status: tickets.status,
    priority: tickets.priority,
    type: tickets.type,
    assigneeId: tickets.assigneeId,
    sprintId: tickets.sprintId,
    epicId: tickets.epicId,
    cycleId: tickets.cycleId,
    points: tickets.points,
    dueDate: tickets.dueDate,
    startDate: tickets.startDate,
    parentTicketId: tickets.parentTicketId,
    clientVisible: tickets.clientVisible,
    updatedAt: tickets.updatedAt,
  };
}

function pickChanged(after: Record<string, unknown>, body: Record<string, unknown>) {
  const changed: Record<string, unknown> = {};
  for (const key of Object.keys(body)) if (key in after) changed[key] = after[key];
  if ("assigneeIds" in body && !("assigneeId" in body)) delete changed.assigneeId;
  return changed;
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId, ticketId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "contribute");
    if (!guard.ok) return guard.response;
    const id = parseIdParam(ticketId);
    if (id === null) return err("Ticket not found", 404);
    const force = req.nextUrl.searchParams.get("force") === "true";
    if (req.nextUrl.searchParams.get("permanent") === "true") {
      return deletePermanently(session.orgId, guard.projectId, id, guard.role);
    }

    const scope = and(eq(tickets.id, id), eq(tickets.projectId, guard.projectId), eq(tickets.orgId, session.orgId), isNull(tickets.deletedAt));
    const ticket = await db.query.tickets.findFirst({ where: scope, columns: { id: true } });
    if (!ticket) return err("Ticket not found", 404);

    if (!force) {
      const blockedBy = await db.query.workItemRelations.findMany({
        where: and(eq(workItemRelations.relatedWorkItemId, id), eq(workItemRelations.relationType, "blocks")),
        columns: { workItemId: true },
        limit: 100,
      });
      if (blockedBy.length > 0) {
        return err(`This ticket is blocked by ${blockedBy.length} other ticket(s). Add ?force=true to archive anyway.`, 409);
      }
    }

    await db.update(tickets).set({ deletedAt: new Date(), updatedAt: new Date() }).where(scope);
    await recordTicketActivity(
      { orgId: session.orgId, projectId: guard.projectId, ticketId: id, actorId: session.user.id },
      [{ action: "archived", field: null, fromValue: null, toValue: null }],
    );

    return ok({ success: true });
  });
}

/**
 * Hard delete for test and junk tickets, next to Archive (BUG-33). Only the
 * project owner (org admins resolve to OWNER). The tables without an
 * ON DELETE CASCADE are cleared first; logged hours stay, unlinked.
 */
async function deletePermanently(orgId: string, projectId: number, id: number, role: string) {
  if (role !== "OWNER") return err("Only an admin or the project owner can delete tickets", 403);
  const ticket = await db.query.tickets.findFirst({
    where: and(eq(tickets.id, id), eq(tickets.projectId, projectId), eq(tickets.orgId, orgId)),
    columns: { id: true },
  });
  if (!ticket) return err("Ticket not found", 404);

  await db.transaction(async (tx) => {
    await tx.update(tickets).set({ parentTicketId: null }).where(eq(tickets.parentTicketId, id));
    await tx.update(timesheets).set({ ticketId: null }).where(eq(timesheets.ticketId, id));
    await tx.update(intakeItems).set({ linkedWorkItemId: null }).where(eq(intakeItems.linkedWorkItemId, id));
    await tx.delete(ticketAssignees).where(eq(ticketAssignees.ticketId, id));
    await tx.delete(ticketComments).where(eq(ticketComments.ticketId, id));
    await tx.delete(ticketAttachments).where(eq(ticketAttachments.ticketId, id));
    await tx.delete(ticketLabelMappings).where(eq(ticketLabelMappings.ticketId, id));
    await tx.delete(tickets).where(eq(tickets.id, id));
  });
  return ok({ success: true });
}
