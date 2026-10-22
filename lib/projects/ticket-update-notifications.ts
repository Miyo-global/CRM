import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tickets, users } from "@/lib/db/schema";
import { createNotification } from "@/server/actions/create-notification";
import { logger } from "@/lib/logger";
import { sendTicketAssignmentEmail, sendTicketReviewRequestEmail, sendTicketChangesRequestedEmail } from "@/lib/email";
import { afterResponse } from "@/lib/after-response";

type TicketUpdateNotice = {
  orgId: string;
  ticketId: number;
  actorId: string;
  actorName: string | null | undefined;
  assigneeId?: string;
  assigneeIds?: string[];
  status?: string;
};

/** "VAIV-128" when the project has a key, otherwise "#128". */
function ticketKey(
  ticket: { ticketNumber?: number | null; project?: { key?: string | null } | null },
  id: number,
): string {
  return ticket.project?.key && ticket.ticketNumber
    ? `${ticket.project.key}-${ticket.ticketNumber}`
    : `#${id}`;
}

export async function notifyTicketUpdate(input: TicketUpdateNotice): Promise<void> {
  const id = input.ticketId;
  const newAssigneeNotifyIds = new Set<string>();
  if (input.assigneeIds !== undefined) {
    input.assigneeIds.forEach((uid) => newAssigneeNotifyIds.add(uid));
  } else if (
    input.assigneeId &&
    input.assigneeId !== "" &&
    input.assigneeId !== "unassigned"
  ) {
    newAssigneeNotifyIds.add(input.assigneeId);
  }

  if (newAssigneeNotifyIds.size > 0) {
    const ticketData = await db.query.tickets.findFirst({
      where: eq(tickets.id, id),
      columns: { title: true, projectId: true, type: true, priority: true, ticketNumber: true },
      with: { project: { columns: { name: true, key: true } } },
    });
    for (const userId of newAssigneeNotifyIds) {
      if (userId === input.actorId) continue;
      try {
        await createNotification({
          orgId: input.orgId,
          userId,
          type: "INFO",
          title: "Ticket Assigned to You",
          message: `You have been assigned to ticket "${ticketData?.title ?? `#${id}`}".`,
          link: ticketData?.projectId ? `/projects/${ticketData.projectId}` : undefined,
        });
      } catch (notifErr) {
        logger.error("Failed to create ticket assignment notification", { error: notifErr });
      }

      afterResponse("projects/ticket-update-notifications", async () => {
        const assignee = await db.query.users.findFirst({
          where: eq(users.id, userId),
          columns: { email: true, name: true },
        });
        if (assignee?.email && ticketData && ticketData.projectId) {
          const issueKey = ticketData.project?.key && ticketData.ticketNumber
            ? `${ticketData.project.key}-${ticketData.ticketNumber}`
            : undefined;
          await sendTicketAssignmentEmail(assignee.email, {
            key: issueKey ?? `#${id}`,
            title: ticketData.title ?? `#${id}`,
            priority: ticketData.priority ?? "MEDIUM",
            projectName: ticketData.project?.name ?? "Project",
            projectId: ticketData.projectId,
            assignedBy: input.actorName ?? "Team Member",
          });
        }
      });
    }
  }

  if (input.status === "IN_REVIEW" || input.status === "CHANGES_REQUESTED") {
    afterResponse("projects/ticket-update-notifications", async () => {
      const ticketData = await db.query.tickets.findFirst({
        where: eq(tickets.id, id),
        columns: {
          title: true,
          projectId: true,
          type: true,
          assigneeId: true,
          reporterId: true,
          ticketNumber: true,
        },
        with: { project: { columns: { name: true, key: true } } },
      });
      if (!ticketData || !ticketData.projectId) return;

      if (input.status === "IN_REVIEW" && ticketData.reporterId) {
        const reviewer = await db.query.users.findFirst({
          where: eq(users.id, ticketData.reporterId),
          columns: { email: true, name: true },
        });
        if (reviewer?.email) {
          await sendTicketReviewRequestEmail(reviewer.email, {
            key: ticketKey(ticketData, id),
            title: ticketData.title ?? `#${id}`,
            projectName: ticketData.project?.name ?? "Project",
            projectId: ticketData.projectId!,
            requestedBy: input.actorName ?? "Team Member",
          });
        }
      }

      if (input.status === "CHANGES_REQUESTED" && ticketData.assigneeId) {
        const assignee = await db.query.users.findFirst({
          where: eq(users.id, ticketData.assigneeId),
          columns: { email: true, name: true },
        });
        if (assignee?.email) {
          await sendTicketChangesRequestedEmail(assignee.email, {
            key: ticketKey(ticketData, id),
            title: ticketData.title ?? `#${id}`,
            projectId: ticketData.projectId!,
            reviewerName: input.actorName ?? "Reviewer",
          });
        }
      }
    });
  }
}
