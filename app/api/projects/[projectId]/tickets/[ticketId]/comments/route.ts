import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketComments, projects, users } from "@/lib/db/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { sendTicketCommentEmail } from "@/lib/email";
import { requireTicket } from "@/lib/projects/require-ticket";
import { recordTicketActivity } from "@/lib/projects/record-ticket-activity";
import { syncCommentMentions } from "@/lib/projects/comment-effects";
import { mentionsToPlainText } from "@/lib/projects/comment-mentions";

type RouteParams = { params: Promise<{ projectId: string; ticketId: string }> };

const commentImageSchema = z.object({
  url: z.string().url(),
  key: z.string().max(500),
  fileName: z.string().max(300),
  mimeType: z.string().max(100).optional(),
}).strict();

const commentSchema = z.object({
  content: z.string().trim().max(20000),
  images: z.array(commentImageSchema).max(10).optional(),
  parentCommentId: z.number().int().positive().optional(),
}).strict().refine((v) => v.content.length > 0 || (v.images?.length ?? 0) > 0, {
  message: "Write a comment or attach a file",
  path: ["content"],
});

export async function POST(req: NextRequest, { params }: RouteParams) {
  return withAuth(async (session) => {
    const { projectId: rawProjectId, ticketId: rawTicketId } = await params;
    const guard = await requireTicket(session, rawProjectId, rawTicketId, "contribute");
    if (!guard.ok) return guard.response;
    const { projectId, ticket } = guard;

    const body = await parseBody(req, commentSchema);

    if (body.parentCommentId) {
      const parent = await db.query.ticketComments.findFirst({
        where: and(
          eq(ticketComments.id, body.parentCommentId),
          eq(ticketComments.ticketId, ticket.id),
          eq(ticketComments.orgId, session.orgId),
          isNull(ticketComments.deletedAt),
        ),
        columns: { parentCommentId: true },
      });
      if (!parent) return err("The comment you replied to no longer exists", 400);
      if (parent.parentCommentId) return err("Replies can only be one level deep", 400);
    }

    const [comment] = await db
      .insert(ticketComments)
      .values({
        orgId: session.orgId,
        ticketId: ticket.id,
        userId: session.user.id,
        content: body.content,
        images: body.images ?? null,
        parentCommentId: body.parentCommentId ?? null,
      })
      .returning();

    const actorName = session.user.name ?? session.user.email ?? "A team member";
    await recordTicketActivity(
      { orgId: session.orgId, projectId, ticketId: ticket.id, actorId: session.user.id },
      [{ action: "comment_added", field: null, fromValue: null, toValue: null }],
    );
    await syncCommentMentions(
      { orgId: session.orgId, projectId, ticketId: ticket.id, ticketTitle: ticket.title, commentId: comment.id, actorId: session.user.id, actorName },
      body.content,
    );

    void emailWatchers(session.user.id, actorName, projectId, ticket, body.content).catch(() => {});

    return ok(comment, 201);
  });
}

async function emailWatchers(
  actorId: string,
  actorName: string,
  projectId: number,
  ticket: { id: number; title: string; assigneeId: string | null; reporterId: string | null },
  content: string,
) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { name: true, managerId: true, key: true },
  });
  const notifyUserIds = new Set<string>();
  for (const id of [ticket.assigneeId, ticket.reporterId, project?.managerId]) {
    if (id && id !== actorId) notifyUserIds.add(id);
  }
  if (notifyUserIds.size === 0) return;

  const recipients = (
    await db.select({ name: users.name, email: users.email }).from(users).where(inArray(users.id, [...notifyUserIds]))
  ).map((u) => ({ email: u.email, name: u.name ?? u.email }));
  if (recipients.length === 0) return;

  await sendTicketCommentEmail(
    recipients,
    actorName,
    ticket.title,
    project?.name ?? "Project",
    projectId,
    ticket.id,
    mentionsToPlainText(content),
    undefined,
  );
}
