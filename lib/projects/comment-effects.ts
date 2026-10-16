import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { organizationMembers, ticketCommentMentions } from "@/lib/db/schema";
import { createNotification } from "@/server/actions/create-notification";
import { logger } from "@/lib/logger";
import { mentionsToPlainText, parseMentionIds } from "@/lib/projects/comment-mentions";

type MentionContext = {
  orgId: string;
  projectId: number;
  ticketId: number;
  ticketTitle: string;
  commentId: number;
  actorId: string;
  actorName: string;
};

export async function syncCommentMentions(ctx: MentionContext, content: string): Promise<void> {
  try {
    const ids = parseMentionIds(content).filter((id) => id !== ctx.actorId);
    if (ids.length === 0) return;
    const members = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(and(eq(organizationMembers.orgId, ctx.orgId), inArray(organizationMembers.userId, ids)));
    if (members.length === 0) return;

    const inserted = await db
      .insert(ticketCommentMentions)
      .values(members.map((m) => ({ orgId: ctx.orgId, commentId: ctx.commentId, userId: m.userId })))
      .onConflictDoNothing()
      .returning({ userId: ticketCommentMentions.userId });

    const preview = mentionsToPlainText(content).slice(0, 140);
    for (const { userId } of inserted) {
      await createNotification({
        orgId: ctx.orgId,
        userId,
        type: "INFO",
        title: `${ctx.actorName} mentioned you`,
        message: `On "${ctx.ticketTitle}": ${preview}`,
        link: `/projects/${ctx.projectId}?ticket=${ctx.ticketId}`,
      });
    }
  } catch (error) {
    logger.error("Failed to record comment mentions", { error, commentId: ctx.commentId });
  }
}
