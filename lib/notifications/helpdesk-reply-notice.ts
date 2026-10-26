/**
 * Who hears about a new helpdesk reply, and what they read (FR1-006). The
 * ticket owner learns of support's replies; the assignee learns of the
 * owner's. Internal notes and your own replies notify nobody.
 */
export function helpdeskReplyNotice(input: {
  ticketId: number;
  ticketTitle: string;
  ownerId: string;
  assigneeId: string | null;
  authorId: string;
  authorName: string | null;
  kind: "comment" | "internal_note";
  body: string;
}): { userId: string; title: string; message: string; link: string } | null {
  if (input.kind !== "comment") return null;
  const recipient = input.authorId === input.ownerId ? input.assigneeId : input.ownerId;
  if (!recipient || recipient === input.authorId) return null;
  const snippet = input.body.length > 140 ? `${input.body.slice(0, 137)}…` : input.body;
  return {
    userId: recipient,
    title: `New reply on "${input.ticketTitle}"`,
    message: `${input.authorName ?? "Someone"}: ${snippet}`,
    link: `/hr/helpdesk?ticket=${input.ticketId}`,
  };
}
