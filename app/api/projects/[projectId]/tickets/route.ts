

import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, toNumber } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { tickets, ticketAssignees, ticketWatchers, users, projects, projectMembers } from "@/lib/db/schema";
import { eq, and, desc, or, sql, count } from "drizzle-orm";
import { sendTicketAssignmentEmail } from "@/lib/email";
import { createNotification } from "@/server/actions/create-notification";
import { isAdminOrOwner } from "@/lib/auth/helpers";
import { logger } from "@/lib/logger";
import { z } from "zod";

const createTicketSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["TASK", "BUG", "STORY", "EPIC", "SUBTASK"]).default("TASK"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().optional(),
  assigneeIds: z.array(z.string()).optional(),
  reporterId: z.string().optional(),
  sprintId: z.number().optional(),
  epicId: z.number().optional(),
  points: z.number().optional(),
  link: z.string().optional(),
  originalEstimate: z.number().optional(),
  parentTicketId: z.number().optional(),
  status: z.string().optional(),
});

type RouteParams = { params: Promise<{ projectId: string }> };

async function checkProjectAccess(session: { user: { id: string; role?: string }; orgId: string }, projectId: number) {
  if (isAdminOrOwner(session.user.role)) return true;
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId)),
    columns: { managerId: true },
  });
  if (!project) return false;
  if (project.managerId === session.user.id) return true;
  const membership = await db
    .select({ id: projectMembers.id })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, session.user.id)))
    .limit(1);
  return membership.length > 0;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const hasAccess = await checkProjectAccess(session, projectId);
    if (!hasAccess) return err("Not found", 404);

    const { searchParams } = req.nextUrl;
    const page = toNumber(searchParams.get("page")) ?? 1;
    const limit = toNumber(searchParams.get("limit")) ?? 20;
    const search = searchParams.get("search") ?? undefined;
    const offset = (page - 1) * limit;

    const baseConditions = [
      eq(tickets.orgId, session.orgId!),
      eq(tickets.projectId, projectId),
    ];

    const searchConditions = search
      ? [
          ...baseConditions,
          or(
            sql`${tickets.title} ILIKE ${"%" + search + "%"}`,
            sql`${tickets.description} ILIKE ${"%" + search + "%"}`
          )!,
        ]
      : baseConditions;

    const [dataResult, countResult] = await Promise.all([
      db.query.tickets.findMany({
        where: and(...searchConditions),
        with: {
          assignee: true,
          reporter: true,
          assignees: { with: { user: true } },
          labels: { with: { label: true } },
        },
        orderBy: [desc(tickets.updatedAt)],
        limit,
        offset,
      }),
      db.select({ total: count() }).from(tickets).where(and(...searchConditions)),
    ]);

    const total = countResult[0]?.total ?? 0;

    return ok({
      data: dataResult,
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    });
  });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: id } = await params;
    const projectId = Number(id);
    if (!projectId) return err("Invalid project id", 400);

    const hasAccess = await checkProjectAccess(session, projectId);
    if (!hasAccess) return err("Not found", 404);

    const body = await parseBody(req, createTicketSchema);

    const normalizeType = (type: string) => {
      const upper = type.toUpperCase();
      return upper === "FEATURE" ? "STORY" : upper;
    };

    const [ticket] = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${projectId})`);

      const maxTicketResult = await tx
        .select({
          maxTicketNumber: sql<number>`COALESCE(MAX(${tickets.ticketNumber}), 0)`,
        })
        .from(tickets)
        .where(and(eq(tickets.projectId, projectId), eq(tickets.orgId, session.orgId!)));

      const nextTicketNumber = (maxTicketResult[0]?.maxTicketNumber || 0) + 1;

      const [created] = await tx
        .insert(tickets)
        .values({
          orgId: session.orgId!,
          projectId,
          ticketNumber: nextTicketNumber,
          title: body.title,
          description: body.description,
          type: normalizeType(body.type),
          priority: body.priority ?? "MEDIUM",
          assigneeId: body.assigneeId,
          reporterId: body.reporterId ?? session.user.id,
          sprintId: body.sprintId,
          epicId: body.epicId,
          points: body.points,
          link: body.link,
          originalEstimate: body.originalEstimate?.toString(),
          parentTicketId: body.parentTicketId,
          status: body.status ?? "TODO",
        })
        .returning();

      const allAssigneeIds = new Set<string>();
      if (body.assigneeId) allAssigneeIds.add(body.assigneeId);
      if (body.assigneeIds) body.assigneeIds.forEach((uid) => allAssigneeIds.add(uid));

      if (allAssigneeIds.size > 0) {
        await tx.insert(ticketAssignees).values(
          Array.from(allAssigneeIds).map((userId) => ({
            ticketId: created.id,
            userId,
            assignedBy: session.user.id,
          }))
        );
      }

      const watcherIds = new Set<string>([session.user.id]);
      allAssigneeIds.forEach((id) => watcherIds.add(id));
      await tx.insert(ticketWatchers).values(
        Array.from(watcherIds).map((userId) => ({
          ticketId: created.id,
          userId,
        }))
      );

      return [created];
    });

    if (body.assigneeId) {
      try {
        const [assignee, creator, project] = await Promise.all([
          db.query.users.findFirst({ where: eq(users.id, body.assigneeId) }),
          db.query.users.findFirst({ where: eq(users.id, body.reporterId ?? session.user.id) }),
          db.query.projects.findFirst({ where: eq(projects.id, projectId) }),
        ]);
        if (assignee?.email && creator && project) {
          const issueKey = project.key && ticket.ticketNumber
            ? `${project.key}-${ticket.ticketNumber}`
            : undefined;
          await sendTicketAssignmentEmail(
            assignee.email,
            assignee.name || assignee.firstName || "Team Member",
            body.title,
            body.type,
            body.priority ?? "MEDIUM",
            project.name,
            projectId,
            ticket.id,
            creator.name || creator.firstName || "Team Member",
            issueKey,
          );
        }
      } catch (emailError) {
        logger.error("Failed to send ticket assignment email", { error: emailError });
      }
    }

    const allNotifyIds = new Set<string>();
    if (body.assigneeId) allNotifyIds.add(body.assigneeId);
    if (body.assigneeIds) body.assigneeIds.forEach((uid) => allNotifyIds.add(uid));

    for (const userId of allNotifyIds) {
      if (userId === session.user.id) continue;
      try {
        await createNotification({
          orgId: session.orgId!,
          userId,
          type: "INFO",
          title: "Ticket Assigned to You",
          message: `You have been assigned to ticket "${body.title}" (${body.type}).`,
          link: `/projects/${projectId}`,
        });
      } catch (err) {
        logger.error("Failed to create ticket assignment notification", { error: err });
      }
    }

    return ok(ticket, 201);
  });
}
