import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tickets, users } from "@/lib/db/schema";
import { createNotification } from "@/server/actions/create-notification";
import { logger } from "@/lib/logger";
import { sendTicketAssignmentEmail, sendTicketReviewRequestEmail, sendTicketChangesRequestedEmail } from "@/lib/email";

type TicketUpdateNotice = {
  orgId: string;
  ticketId: number;
  actorId: string;
  actorName: string | null | undefined;
  assigneeId?: string;
  assigneeIds?: string[];
  status?: string;
};

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
            input.actorName ?? "Team Member",
            issueKey,
          );
        }
      })().catch(() => {});
    }
  }

  if (input.status === "IN_REVIEW" || input.status === "CHANGES_REQUESTED") {
    void (async () => {
      const ticketData = await db.query.tickets.findFirst({
        where: eq(tickets.id, id),
        columns: { title: true, projectId: true, type: true, assigneeId: true, reporterId: true },
        with: { project: { columns: { name: true } } },
      });
      if (!ticketData || !ticketData.projectId) return;

      if (input.status === "IN_REVIEW" && ticketData.reporterId) {
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
            input.actorName ?? "Team Member"
          );
        }
      }

      if (input.status === "CHANGES_REQUESTED" && ticketData.assigneeId) {
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
            input.actorName ?? "Reviewer"
          );
        }
      }
    })().catch(() => {});
  }
}
