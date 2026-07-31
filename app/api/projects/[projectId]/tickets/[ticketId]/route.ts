

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets, ticketAssignees, ticketComments, ticketAttachments, ticketLabelMappings, ticketWatchers, timesheets, workItemRelations, users } from "@/lib/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { createNotification } from "@/server/actions/create-notification";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { sendTicketAssignmentEmail, sendTicketReviewRequestEmail, sendTicketChangesRequestedEmail } from "@/lib/email";

const updateTicketSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  sprintId: z.number().nullable().optional(),
  epicId: z.number().nullable().optional(),
  points: z.number().nullable().optional(),
  originalEstimate: z.number().nullable().optional(),
});

type RouteParams = { params: Promise<{ projectId: string; ticketId: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId, ticketId } = await params;
    const id = Number(ticketId);
    const pid = Number(projectId);
    if (!id || !pid) return err("Invalid ticket id", 400);

    const ticket = await db.query.tickets.findFirst({
      where: and(eq(tickets.id, id), eq(tickets.projectId, pid), eq(tickets.orgId, session.orgId!)),
      with: {
        project: true,
        sprint: true,
        assignee: true,
        reporter: true,
        assignees: { with: { user: true } },
        comments: { with: { user: true }, orderBy: [desc(ticketComments.createdAt)] },
        attachments: { with: { uploader: true } },
        labels: { with: { label: true } },
      },
    });

    if (!ticket) return err("Ticket not found", 404);

    if (!isAdminOrOwner(session.user.role)) {
      const isAssignee =
        ticket.assigneeId === session.user.id ||
        ticket.assignees.some((a) => a.userId === session.user.id);
      const isReporter = ticket.reporterId === session.user.id;
      if (!isAssignee && !isReporter) {
        return err("You don't have access to this ticket's details.", 403);
      }
    }

    return ok(ticket);
  });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId, ticketId } = await params;
    const id = Number(ticketId);
    const pid = Number(projectId);
    if (!id || !pid) return err("Invalid ticket id", 400);

    const existingTicket = await db.query.tickets.findFirst({
      where: and(eq(tickets.id, id), eq(tickets.projectId, pid), eq(tickets.orgId, session.orgId!)),
      columns: { id: true, assigneeId: true, reporterId: true },
      with: { assignees: { columns: { userId: true } } },
    });
    if (!existingTicket) return err("Ticket not found", 404);

    if (!isAdminOrOwner(session.user.role)) {
      const isAssignee =
        existingTicket.assigneeId === session.user.id ||
        existingTicket.assignees.some((a) => a.userId === session.user.id);
      const isReporter = existingTicket.reporterId === session.user.id;
      if (!isAssignee && !isReporter) {
        return err("You don't have permission to update this ticket.", 403);
      }
    }

    const body = await parseBody(req, updateTicketSchema);

    const normalizeType = (type: string) => {
      const upper = type.toUpperCase();
      return upper === "FEATURE" ? "STORY" : upper;
    };

    const updateFields: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title) updateFields.title = body.title;
    if (body.description !== undefined) updateFields.description = body.description;
    if (body.type) updateFields.type = normalizeType(body.type);
    if (body.status) updateFields.status = body.status;
    if (body.priority) updateFields.priority = body.priority;
    if (body.assigneeId !== undefined) {
      updateFields.assigneeId =
        body.assigneeId === "" || body.assigneeId === "unassigned"
          ? null
          : body.assigneeId;
    }
    if (body.sprintId !== undefined) updateFields.sprintId = body.sprintId;
    if (body.epicId !== undefined) updateFields.epicId = body.epicId;
    if (body.points !== undefined) updateFields.points = body.points;
    if (body.originalEstimate !== undefined) {
      updateFields.originalEstimate = body.originalEstimate?.toString();
    }

    await db
      .update(tickets)
      .set(updateFields)
      .where(and(eq(tickets.id, id), eq(tickets.projectId, pid), eq(tickets.orgId, session.orgId!)));

    if (body.assigneeIds !== undefined) {
      await db.delete(ticketAssignees).where(eq(ticketAssignees.ticketId, id));
      const allIds = new Set(body.assigneeIds);
      if (
        body.assigneeId &&
        body.assigneeId !== "" &&
        body.assigneeId !== "unassigned"
      ) {
        allIds.add(body.assigneeId);
      }
      if (allIds.size > 0) {
        await db.insert(ticketAssignees).values(
          Array.from(allIds).map((userId) => ({
            ticketId: id,
            userId,
            assignedBy: session.user.id,
          }))
        );
      }
    } else if (body.assigneeId !== undefined) {
      await db.delete(ticketAssignees).where(eq(ticketAssignees.ticketId, id));
      const newId =
        body.assigneeId === "" || body.assigneeId === "unassigned"
          ? null
          : body.assigneeId;
      if (newId) {
        await db.insert(ticketAssignees).values({
          ticketId: id,
          userId: newId,
          assignedBy: session.user.id,
        });
      }
    }

    const newAssigneeNotifyIds = new Set<string>();
    if (body.assigneeIds !== undefined) {
      body.assigneeIds.forEach((uid) => newAssigneeNotifyIds.add(uid));
    } else if (
      body.assigneeId &&
      body.assigneeId !== "" &&
      body.assigneeId !== "unassigned"
    ) {
      newAssigneeNotifyIds.add(body.assigneeId);
    }

    if (newAssigneeNotifyIds.size > 0) {
      const ticketData = await db.query.tickets.findFirst({
        where: eq(tickets.id, id),
        columns: { title: true, projectId: true, type: true, priority: true, ticketNumber: true },
        with: { project: { columns: { name: true, key: true } } },
      });
      for (const userId of newAssigneeNotifyIds) {
        if (userId === session.user.id) continue;
        try {
          await createNotification({
            orgId: session.orgId!,
            userId,
            type: "INFO",
            title: "Ticket Assigned to You",
            message: `You have been assigned to ticket "${ticketData?.title ?? `#${id}`}".`,
            link: ticketData?.projectId ? `/projects/${ticketData.projectId}` : undefined,
          });
        } catch (notifErr) {
          logger.error("Failed to create ticket assignment notification", { error: notifErr });
        }

        void (async () => {
          const assignee = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { email: true, name: true },
          });
          if (assignee?.email && ticketData && ticketData.projectId) {
            const issueKey = ticketData.project?.key && ticketData.ticketNumber
              ? `${ticketData.project.key}-${ticketData.ticketNumber}`
              : undefined;
            await sendTicketAssignmentEmail(
              assignee.email,
              assignee.name ?? "Team Member",
              ticketData.title ?? `#${id}`,
              ticketData.type ?? "TASK",
              ticketData.priority ?? "MEDIUM",
              ticketData.project?.name ?? "Project",
              ticketData.projectId,
              id,
              session.user.name ?? "Team Member",
              issueKey,
            );
          }
        })().catch(() => {});
      }
    }

    if (body.status === "IN_REVIEW" || body.status === "CHANGES_REQUESTED") {
      void (async () => {
        const ticketData = await db.query.tickets.findFirst({
          where: eq(tickets.id, id),
          columns: { title: true, projectId: true, type: true, assigneeId: true, reporterId: true },
          with: { project: { columns: { name: true } } },
        });
        if (!ticketData || !ticketData.projectId) return;

        if (body.status === "IN_REVIEW" && ticketData.reporterId) {
          const reviewer = await db.query.users.findFirst({
            where: eq(users.id, ticketData.reporterId),
            columns: { email: true, name: true },
          });
          if (reviewer?.email) {
            await sendTicketReviewRequestEmail(
              reviewer.email,
              reviewer.name ?? "Reviewer",
              ticketData.title ?? `#${id}`,
              ticketData.type ?? "TASK",
              ticketData.project?.name ?? "Project",
              ticketData.projectId!,
              id,
              session.user.name ?? "Team Member"
            );
          }
        }

        if (body.status === "CHANGES_REQUESTED" && ticketData.assigneeId) {
          const assignee = await db.query.users.findFirst({
            where: eq(users.id, ticketData.assigneeId),
            columns: { email: true, name: true },
          });
          if (assignee?.email) {
            await sendTicketChangesRequestedEmail(
              assignee.email,
              assignee.name ?? "Team Member",
              ticketData.title ?? `#${id}`,
              ticketData.project?.name ?? "Project",
              ticketData.projectId!,
              id,
              session.user.name ?? "Reviewer"
            );
          }
        }
      })().catch(() => {});
    }

    return ok({ success: true });
  });
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId, ticketId } = await params;
    const id = Number(ticketId);
    const pid = Number(projectId);
    if (!id || !pid) return err("Invalid ticket id", 400);
    const force = req.nextUrl.searchParams.get("force") === "true";

    const ticket = await db.query.tickets.findFirst({
      where: and(eq(tickets.id, id), eq(tickets.projectId, pid), eq(tickets.orgId, session.orgId!)),
      columns: { id: true },
    });
    if (!ticket) return err("Ticket not found", 404);

    if (!force) {
      const blockedBy = await db.query.workItemRelations.findMany({
        where: and(
          eq(workItemRelations.relatedWorkItemId, id),
          eq(workItemRelations.relationType, "blocks")
        ),
        columns: { workItemId: true },
      });
      if (blockedBy.length > 0) {
        return err(
          `This ticket is blocked by ${blockedBy.length} other ticket(s). Add ?force=true to delete anyway.`,
          409
        );
      }
    }

    const approvedTimesheets = await db.query.timesheets.findMany({
      where: and(eq(timesheets.ticketId, id), eq(timesheets.status, "APPROVED")),
      columns: { id: true },
    });
    if (approvedTimesheets.length > 0) {
      return err(
        `This ticket has ${approvedTimesheets.length} approved timesheet(s) and cannot be deleted.`,
        409
      );
    }

    await db.transaction(async (tx) => {

      await tx.update(tickets).set({ parentTicketId: null }).where(eq(tickets.parentTicketId, id));
      await tx.update(tickets).set({ epicId: null }).where(eq(tickets.epicId, id));

      await tx.delete(ticketAssignees).where(eq(ticketAssignees.ticketId, id));
      await tx.delete(ticketComments).where(eq(ticketComments.ticketId, id));
      await tx.delete(ticketAttachments).where(eq(ticketAttachments.ticketId, id));
      await tx.delete(ticketLabelMappings).where(eq(ticketLabelMappings.ticketId, id));
      await tx.delete(ticketWatchers).where(eq(ticketWatchers.ticketId, id));
      await tx.delete(timesheets).where(eq(timesheets.ticketId, id));
      await tx.delete(workItemRelations).where(
        or(eq(workItemRelations.workItemId, id), eq(workItemRelations.relatedWorkItemId, id))
      );

      await tx.delete(tickets).where(eq(tickets.id, id));
    });

    return ok({ success: true });
  });
}
