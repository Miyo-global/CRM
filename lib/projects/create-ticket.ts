import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects, ticketAssignees, tickets, ticketWatchers, users } from "@/lib/db/schema";
import { sendTicketAssignmentEmail } from "@/lib/email";
import { createNotification } from "@/server/actions/create-notification";
import { recordTicketActivity } from "@/lib/projects/record-ticket-activity";
import { ticketTitleSchema } from "@/lib/validations/project";
import { afterResponse } from "@/lib/after-response";

export const createTicketSchema = z.object({
  title: ticketTitleSchema,
  description: z.string().optional(),
  type: z.enum(["TASK", "BUG", "STORY", "EPIC", "SUBTASK"]).default("TASK"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().max(200).optional(),
  assigneeIds: z.array(z.string().max(200)).max(50).optional(),
  reporterId: z.string().max(200).optional(),
  sprintId: z.number().int().positive().optional(),
  epicId: z.number().int().positive().optional(),
  cycleId: z.number().int().positive().optional(),
  moduleId: z.number().int().positive().optional(),
  points: z.number().int().min(0).max(1000).optional(),
  link: z.string().max(2000).optional(),
  originalEstimate: z.number().min(0).optional(),
  parentTicketId: z.number().int().positive().optional(),
  status: z.string().min(1).max(80).optional(),
  dueDate: z.string().date().optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

type CreateContext = {
  orgId: string;
  projectId: number;
  actorId: string;
  /** Off for bulk imports, which would otherwise email every assignee once per row (MIYO-0121). */
  notify?: boolean;
};

export function ticketAssigneeIds(input: Pick<CreateTicketInput, "assigneeId" | "assigneeIds">): Set<string> {
  const ids = new Set<string>(input.assigneeIds ?? []);
  if (input.assigneeId) ids.add(input.assigneeId);
  return ids;
}

export async function createTicket(ctx: CreateContext, input: CreateTicketInput) {
  const assigneeIds = ticketAssigneeIds(input);
  const type = input.type.toUpperCase();

  const created = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${ctx.projectId})`);

    const [next] = await tx
      .select({
        ticketNumber: sql<number>`COALESCE(MAX(${tickets.ticketNumber}), 0) + 1`,
        rank: sql<string>`COALESCE(MAX(COALESCE(${tickets.rank}, ${tickets.order} * 1000)), 0) + 1000`,
      })
      .from(tickets)
      .where(and(eq(tickets.projectId, ctx.projectId), eq(tickets.orgId, ctx.orgId)));

    const [row] = await tx
      .insert(tickets)
      .values({
        orgId: ctx.orgId,
        projectId: ctx.projectId,
        ticketNumber: Number(next.ticketNumber),
        rank: String(next.rank),
        title: input.title,
        description: input.description,
        type,
        priority: input.priority ?? "MEDIUM",
        assigneeId: input.assigneeId ?? null,
        reporterId: input.reporterId ?? ctx.actorId,
        sprintId: input.sprintId,
        epicId: input.epicId,
        cycleId: input.cycleId,
        moduleId: input.moduleId,
        points: input.points,
        link: input.link,
        originalEstimate: input.originalEstimate?.toString(),
        parentTicketId: input.parentTicketId,
        status: input.status ?? "TODO",
        dueDate: input.dueDate,
      })
      .returning();

    if (assigneeIds.size > 0) {
      await tx.insert(ticketAssignees).values(
        [...assigneeIds].map((userId) => ({ ticketId: row.id, userId, assignedBy: ctx.actorId })),
      );
    }

    const watcherIds = new Set<string>([ctx.actorId, ...assigneeIds]);
    await tx.insert(ticketWatchers).values([...watcherIds].map((userId) => ({ ticketId: row.id, userId })));

    return row;
  });

  await recordTicketActivity(
    { orgId: ctx.orgId, projectId: ctx.projectId, ticketId: created.id, actorId: ctx.actorId },
    [{ action: "created", field: null, fromValue: null, toValue: null }],
  );

  // MIYO-0122: let the org's webhook endpoints hear about new tickets.
  void import("@/lib/webhooks/dispatch").then(({ dispatchWebhook }) =>
    dispatchWebhook(ctx.orgId, "ticket.created", {
      ticketId: created.id,
      projectId: ctx.projectId,
      ticketNumber: created.ticketNumber,
      title: created.title,
      type: created.type,
      status: created.status,
      priority: created.priority,
      assigneeId: created.assigneeId,
    }),
  );

  if (ctx.notify !== false) {
    afterResponse("projects/create-ticket", () => notifyNewTicket(ctx, input, created, assigneeIds));
  }

  return created;
}

async function notifyNewTicket(
  ctx: CreateContext,
  input: CreateTicketInput,
  ticket: { id: number; ticketNumber: number },
  assigneeIds: Set<string>,
) {
  if (input.assigneeId) {
    const [assignee, creator, project] = await Promise.all([
      db.query.users.findFirst({ where: eq(users.id, input.assigneeId), columns: { email: true, name: true, firstName: true } }),
      db.query.users.findFirst({ where: eq(users.id, input.reporterId ?? ctx.actorId), columns: { name: true, firstName: true } }),
      db.query.projects.findFirst({ where: eq(projects.id, ctx.projectId), columns: { name: true, key: true } }),
    ]);
    if (assignee?.email && creator && project) {
      await sendTicketAssignmentEmail(assignee.email, {
        key: project.key ? `${project.key}-${ticket.ticketNumber}` : `#${ticket.id}`,
        title: input.title,
        priority: input.priority ?? "MEDIUM",
        dueDate: input.dueDate ?? null,
        projectName: project.name,
        projectId: ctx.projectId,
        assignedBy: creator.name || creator.firstName || "Team Member",
      });
    }
  }

  for (const userId of assigneeIds) {
    if (userId === ctx.actorId) continue;
    await createNotification({
      orgId: ctx.orgId,
      userId,
      type: "INFO",
      title: "Ticket assigned to you",
      message: `You were assigned to "${input.title}".`,
      link: `/projects/${ctx.projectId}?ticket=${ticket.id}`,
    });
  }
}
