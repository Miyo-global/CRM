import { and, eq } from "drizzle-orm";
import { err } from "@/lib/api/helpers";
import { db } from "@/lib/db";
import { ticketComments } from "@/lib/db/schema";
import { isAdminOrOwner } from "@/lib/constants/roles";
import { parseIdParam } from "@/lib/projects/require-project-access";

type CommentRow = { id: number; userId: string; content: string; deletedAt: Date | null; parentCommentId: number | null };

export async function loadComment(
  orgId: string,
  ticketId: number,
  rawCommentId: string,
): Promise<{ ok: true; comment: CommentRow } | { ok: false; response: ReturnType<typeof err> }> {
  const id = parseIdParam(rawCommentId);
  if (id === null) return { ok: false, response: err("Comment not found", 404) };
  const comment = await db.query.ticketComments.findFirst({
    where: and(eq(ticketComments.id, id), eq(ticketComments.ticketId, ticketId), eq(ticketComments.orgId, orgId)),
    columns: { id: true, userId: true, content: true, deletedAt: true, parentCommentId: true },
  });
  if (!comment) return { ok: false, response: err("Comment not found", 404) };
  return { ok: true, comment };
}

export function canModifyComment(user: { id: string; role?: string | null }, authorId: string): boolean {
  return authorId === user.id || isAdminOrOwner(user.role);
}
