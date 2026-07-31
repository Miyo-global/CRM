

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import {
  projects,
  projectMembers,
  projectStatuses,
  tickets,
  ticketAssignees,
  ticketComments,
  ticketAttachments,
  ticketLabelMappings,
  timesheets,
  sprints,
  users,
} from "@/lib/db/schema";
import { eq, and, desc, asc, inArray, ne } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { createAuditLog } from "@/lib/audit-log";
import { sendProjectAssignmentEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { z } from "zod";

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
  managerId: z.string().optional(),
  clientId: z.string().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  memberIds: z.array(z.string()).optional(),
  reassignments: z.record(z.string(), z.string()).optional(),
});

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const isOwnerOrAdmin = isAdminOrOwner(session.user.role);

    const projectCheck = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId!)),
    });

    if (!projectCheck) return err("Project not found", 404);

    if (!isOwnerOrAdmin) {
      const isManager = projectCheck.managerId === session.user.id;
      if (!isManager) {
        const memberOf = await db
          .select({ projectId: projectMembers.projectId })
          .from(projectMembers)
          .where(
            and(
              eq(projectMembers.userId, session.user.id),
              eq(projectMembers.projectId, projectId)
            )
          );
        if (memberOf.length === 0) return err("Not found", 404);
      }
    }

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId!)),
      with: {
        statuses: { orderBy: [asc(projectStatuses.order)] },
        members: { with: { user: true } },
        tickets: {
          with: {
            assignee: true,
            reporter: true,
            assignees: { with: { user: true } },
            comments: { with: { user: true } },
            attachments: true,
            labels: { with: { label: true } },
          },
        },
      },
    });

    if (!project) return err("Project not found", 404);

    return ok(project);
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const isOwnerOrAdmin = isAdminOrOwner(session.user.role);
    if (!isOwnerOrAdmin) {
      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId!)),
        columns: { managerId: true },
      });
      if (!project || project.managerId !== session.user.id) {
        return err("Only project managers or admins can update project settings.", 403);
      }
    }

    const body = await parseBody(req, updateProjectSchema);

    await db
      .update(projects)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.managerId !== undefined && { managerId: body.managerId }),
        ...(body.clientId !== undefined && { clientId: body.clientId }),
        ...(body.startDate !== undefined && {
          startDate: body.startDate ? new Date(body.startDate) : null,
        }),
        ...(body.endDate !== undefined && {
          endDate: body.endDate ? new Date(body.endDate) : null,
        }),
      })
      .where(
        and(eq(projects.orgId, session.orgId!), eq(projects.id, projectId))
      );

    if (body.memberIds !== undefined) {
      const existingMemberIds = await db.transaction(async (tx) => {
        const existingMembers = await tx
          .select({ userId: projectMembers.userId })
          .from(projectMembers)
          .where(eq(projectMembers.projectId, projectId));

        const existing = new Set(existingMembers.map((m) => m.userId));

        await tx.delete(projectMembers).where(eq(projectMembers.projectId, projectId));

        if (body.memberIds!.length > 0) {
          await tx.insert(projectMembers).values(
            body.memberIds!.map((userId) => ({
              projectId,
              userId,
              role: "CONTRIBUTOR",
            }))
          );
        }

        const newMemberSet = new Set(body.memberIds!);
        const removedMembers = [...existing].filter((id) => !newMemberSet.has(id));
        if (removedMembers.length > 0 && body.reassignments) {
          const openTickets = await tx
            .select({ id: tickets.id, assigneeId: tickets.assigneeId })
            .from(tickets)
            .where(
              and(
                eq(tickets.projectId, projectId),
                inArray(tickets.assigneeId, removedMembers),
                ne(tickets.status, "DONE"),
                ne(tickets.status, "CANCELLED"),
              )
            );
          for (const ticket of openTickets) {
            const newAssignee = ticket.assigneeId
              ? (body.reassignments[ticket.assigneeId] ?? null)
              : null;
            await tx
              .update(tickets)
              .set({ assigneeId: newAssignee })
              .where(eq(tickets.id, ticket.id));
          }
        } else if (removedMembers.length > 0) {
          await tx
            .update(tickets)
            .set({ assigneeId: null })
            .where(
              and(
                eq(tickets.projectId, projectId),
                inArray(tickets.assigneeId, removedMembers),
                ne(tickets.status, "DONE"),
                ne(tickets.status, "CANCELLED"),
              )
            );
        }

        return existing;
      });

      const newMemberIds = body.memberIds.filter((id) => !existingMemberIds.has(id));
      if (newMemberIds.length > 0) {
        const [currentUser, project, newMembers] = await Promise.all([
          db.query.users.findFirst({ where: eq(users.id, session.user.id) }),
          db.query.projects.findFirst({ where: eq(projects.id, projectId) }),
          db.query.users.findMany({ where: inArray(users.id, newMemberIds) }),
        ]);
        if (project) {
          for (const member of newMembers) {
            if (member.email) {
              try {
                await sendProjectAssignmentEmail(
                  member.email,
                  member.name || member.firstName || "Team Member",
                  project.name,
                  project.key,
                  project.id,
                  currentUser?.name || currentUser?.firstName || undefined
                );
              } catch (emailError) {
                logger.error("Failed to send project update email", { error: emailError });
              }
            }
          }
        }
      }
    }

    void createAuditLog({
      action: "project.updated",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(projectId),
      targetType: "project",
      metadata: { changedFields: Object.keys(body) },
    }).catch(() => {});

    return ok({ success: true });
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    if (session.user.role !== "CEO") {
      return err("Only organization owners can delete projects", 403);
    }

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId!)),
    });
    if (!project) return err("Project not found", 404);

    await db.transaction(async (tx) => {
      const projectTickets = await tx
        .select({ id: tickets.id })
        .from(tickets)
        .where(eq(tickets.projectId, projectId));

      const ticketIds = projectTickets.map((t) => t.id);
      if (ticketIds.length > 0) {
        await tx.delete(ticketAssignees).where(inArray(ticketAssignees.ticketId, ticketIds));
        await tx.delete(ticketComments).where(inArray(ticketComments.ticketId, ticketIds));
        await tx.delete(ticketAttachments).where(inArray(ticketAttachments.ticketId, ticketIds));
        await tx.delete(ticketLabelMappings).where(inArray(ticketLabelMappings.ticketId, ticketIds));
        await tx
          .update(timesheets)
          .set({ ticketId: null })
          .where(and(inArray(timesheets.ticketId, ticketIds), eq(timesheets.status, "APPROVED")));
        await tx
          .delete(timesheets)
          .where(and(inArray(timesheets.ticketId, ticketIds), ne(timesheets.status, "APPROVED")));
        await tx.delete(tickets).where(inArray(tickets.id, ticketIds));
      }
      await tx.delete(sprints).where(eq(sprints.projectId, projectId));
      await tx.delete(projectMembers).where(eq(projectMembers.projectId, projectId));
      await tx.delete(projectStatuses).where(eq(projectStatuses.projectId, projectId));
      await tx.delete(projects).where(eq(projects.id, projectId));
    });

    void createAuditLog({
      action: "project.deleted",
      userId: session.user.id,
      orgId: session.orgId,
      targetId: String(projectId),
      targetType: "project",
      metadata: { name: project.name },
    }).catch(() => {});

    return ok({ success: true });
  });
}
