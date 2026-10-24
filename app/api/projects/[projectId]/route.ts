import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { projects, projectMembers, projectStatuses, tickets, ticketComments, users } from "@/lib/db/schema";
import { eq, and, asc, inArray, ne, isNull, desc } from "drizzle-orm";
import { createAuditLog, diffFields } from "@/lib/audit-log";
import { sendProjectAssignmentEmail } from "@/lib/email";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { requireProjectAccess } from "@/lib/projects/require-project-access";
import { allOrgMembers } from "@/lib/projects/assignable-users";
import { userColumns } from "@/lib/projects/ticket-columns";
import { hasFullAccess } from "@/lib/constants/roles";
import { DUPLICATE_PROJECT_NAME, isProjectNameTaken } from "@/lib/projects/project-key-availability";

const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).nullable().optional(),
  managerId: z.string().max(200).optional(),
  clientId: z.string().max(200).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  memberIds: z.array(z.string().max(200)).max(200).optional(),
  reassignments: z.record(z.string(), z.string()).optional(),
});

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "view");
    if (!guard.ok) return guard.response;

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, guard.projectId), eq(projects.orgId, session.orgId)),
      with: {
        statuses: { orderBy: [asc(projectStatuses.order)] },
        members: { with: { user: { columns: userColumns } } },
        manager: { columns: userColumns },
        tickets: {
          where: isNull(tickets.deletedAt),
          orderBy: [asc(tickets.rank), asc(tickets.order), desc(tickets.id)],
          with: {
            assignee: { columns: userColumns },
            reporter: { columns: userColumns },
            assignees: { with: { user: { columns: userColumns } } },
            labels: { with: { label: true } },
            // MIYO-0111: just enough for the "2/5" on the card.
            checklistItems: { columns: { id: true, isDone: true } },
          },
        },
      },
    });

    if (!project) return err("Project not found", 404);
    const canManage = guard.role === "OWNER" || guard.role === "MANAGER";
    return ok({ ...project, intakeToken: canManage ? project.intakeToken : null, viewerRole: guard.role });
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "manage");
    if (!guard.ok) return guard.response;
    const { projectId } = guard;

    const body = await parseBody(req, updateProjectSchema);
    if (body.name !== undefined && (await isProjectNameTaken(session.orgId, body.name, projectId))) {
      return err(DUPLICATE_PROJECT_NAME, 409);
    }

    const people = [...(body.memberIds ?? []), ...Object.values(body.reassignments ?? {})];
    if (body.managerId) people.push(body.managerId);
    if (body.clientId) people.push(body.clientId);
    if (!(await allOrgMembers(session.orgId, people))) {
      return err("Everyone on the project must be a member of this organization", 400);
    }

    const before = await db.query.projects.findFirst({
      where: and(eq(projects.orgId, session.orgId), eq(projects.id, projectId)),
      columns: { name: true, description: true, status: true, priority: true, managerId: true, clientId: true, startDate: true, endDate: true },
    });
    // R3-ADM-09: only fields whose value really changed reach the audit log.
    const changedFields = Object.keys(
      diffFields(before ?? {}, {
        name: body.name,
        description: body.description,
        status: body.status,
        priority: body.priority,
        managerId: body.managerId,
        clientId: body.clientId,
        startDate: body.startDate === undefined ? undefined : body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate === undefined ? undefined : body.endDate ? new Date(body.endDate) : null,
      }),
    );

    await db
      .update(projects)
      .set({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && {
          status: body.status,
          archivedAt: body.status === "ARCHIVED" ? new Date() : null,
        }),
        ...(body.priority !== undefined && { priority: body.priority }),
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
        and(eq(projects.orgId, session.orgId), eq(projects.id, projectId))
      );

    if (body.memberIds !== undefined) {
      const existingMemberIds = await db.transaction(async (tx) => {
        const existingMembers = await tx
          .select({ userId: projectMembers.userId })
          .from(projectMembers)
          .where(eq(projectMembers.projectId, projectId));

        const existing = new Set(existingMembers.map((m) => m.userId));

        const newMemberSet = new Set(body.memberIds!);
        const removedMembers = [...existing].filter((id) => !newMemberSet.has(id));
        const addedMembers = [...newMemberSet].filter((id) => !existing.has(id));

        if (removedMembers.length > 0) {
          await tx
            .delete(projectMembers)
            .where(and(eq(projectMembers.projectId, projectId), inArray(projectMembers.userId, removedMembers)));
        }
        if (addedMembers.length > 0 || removedMembers.length > 0) changedFields.push("memberIds");
        if (addedMembers.length > 0) {
          await tx.insert(projectMembers).values(
            addedMembers.map((userId) => ({ projectId, userId, role: "CONTRIBUTOR" }))
          );
        }
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
          db.query.users.findFirst({ where: eq(users.id, session.user.id), columns: { name: true, firstName: true } }),
          db.query.projects.findFirst({ where: eq(projects.id, projectId), columns: { id: true, name: true, key: true } }),
          db.query.users.findMany({ where: inArray(users.id, newMemberIds), columns: { email: true, name: true, firstName: true } }),
        ]);
        if (project) {
          for (const member of newMembers) {
            if (member.email) {
              try {
                await sendProjectAssignmentEmail(member.email, {
                  name: project.name,
                  key: project.key,
                  id: project.id,
                  role: "member",
                  addedBy: currentUser?.name || currentUser?.firstName || "a project admin",
                });
              } catch (emailError) {
                logger.error("Failed to send project update email", { error: emailError });
              }
            }
          }
        }
      }
    }

    if (changedFields.length > 0) {
      void createAuditLog({
        action: "project.updated",
        userId: session.user.id,
        orgId: session.orgId,
        targetId: String(projectId),
        targetType: "project",
        metadata: { changedFields },
      }).catch(() => {});
    }

    return ok({ success: true });
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId } = await params;
    const guard = await requireProjectAccess(session, rawProjectId, "manage");
    if (!guard.ok) return guard.response;
    // Super Admin and Admins (BUG-33); it was CEO-only, which nobody held.
    if (!hasFullAccess(session.user.role)) return err("Only admins can delete projects", 403);
    const { projectId } = guard;

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId)),
      columns: { name: true },
    });
    if (!project) return err("Project not found", 404);

    const deletedAt = new Date();
    await db.transaction(async (tx) => {
      const live = and(eq(tickets.projectId, projectId), isNull(tickets.deletedAt));
      const ticketRows = await tx.select({ id: tickets.id }).from(tickets).where(live);
      const ticketIds = ticketRows.map((t) => t.id);
      if (ticketIds.length > 0) {
        await tx
          .update(ticketComments)
          .set({ deletedAt })
          .where(and(inArray(ticketComments.ticketId, ticketIds), isNull(ticketComments.deletedAt)));
        await tx.update(tickets).set({ deletedAt }).where(and(live, inArray(tickets.id, ticketIds)));
      }
      await tx.update(projects).set({ deletedAt }).where(eq(projects.id, projectId));
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
