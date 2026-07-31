import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketComments, tickets, projects, projectMembers, users } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { isAdminOrOwner } from "@/lib/auth/role-guards";
import { z } from "zod";
import { sendTicketCommentEmail } from "@/lib/email";

type RouteParams = { params: Promise<{ projectId: string; ticketId: string }> };

const commentImageSchema = z.object({
  url: z.string().url(),
  key: z.string(),
  fileName: z.string(),
  mimeType: z.string().optional(),
});

const commentSchema = z.object({
  content: z.string().min(1),
  images: z.array(commentImageSchema).max(10).optional(),
});

async function checkProjectAccess(
  session: { user: { id: string; role?: string | null }; orgId: string },
  projectId: number
) {
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

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: pid, ticketId: tid } = await params;
    const projectId = Number(pid);
    const ticketId = Number(tid);
    if (!projectId || !ticketId) return err("Invalid project or ticket id", 400);

    const hasAccess = await checkProjectAccess(
      { user: session.user, orgId: session.orgId! },
      projectId
    );
    if (!hasAccess) return err("You do not have access to this project", 403);

    const ticket = await db.query.tickets.findFirst({
      where: and(
        eq(tickets.id, ticketId),
        eq(tickets.orgId, session.orgId!),
        eq(tickets.projectId, projectId)
      ),
      columns: { id: true, title: true, assigneeId: true, reporterId: true, sequenceId: true },
    });
    if (!ticket) return err("Ticket not found", 404);

    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.orgId, session.orgId!)),
      columns: { name: true, managerId: true },
    });

    const body = await parseBody(req, commentSchema);

    const [comment] = await db
      .insert(ticketComments)
      .values({
        orgId: session.orgId!,
        ticketId,
        userId: session.user.id,
        content: body.content,
        images: body.images ?? null,
      })
      .returning();

    const notifyUserIds = new Set<string>();
    if (ticket.assigneeId && ticket.assigneeId !== session.user.id)
      notifyUserIds.add(ticket.assigneeId);
    if (ticket.reporterId && ticket.reporterId !== session.user.id)
      notifyUserIds.add(ticket.reporterId);
    if (project?.managerId && project.managerId !== session.user.id)
      notifyUserIds.add(project.managerId);

    if (notifyUserIds.size > 0) {
      const notifyUsers = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, Array.from(notifyUserIds)));

      const commenter = session.user.name ?? session.user.email ?? "A team member";
      const recipients = notifyUsers
        .filter((u) => u.email)
        .map((u) => ({ email: u.email!, name: u.name ?? u.email! }));

      if (recipients.length > 0) {
        sendTicketCommentEmail(
          recipients,
          commenter,
          ticket.title,
          project?.name ?? "Project",
          projectId,
          ticketId,
          body.content,
          ticket.sequenceId ?? undefined,
        ).catch(() => {});
      }
    }

    return ok(comment, 201);
  });
}
