import { sendTemplateEmail } from "./sender";

/** First 90 characters of a comment or note, for the preheader line. */
function snippet(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 90 ? `${flat.slice(0, 89)}…` : flat;
}

/** MIYO-0277: the hand-written project-added template. */
export async function sendProjectAssignmentEmail(
  email: string,
  project: {
    name: string;
    key: string;
    id: number;
    role: string;
    addedBy: string;
  },
) {
  await sendTemplateEmail("project-added", {
    to: email,
    category: "tasks",
    vars: {
      project_name: project.name,
      project_key: project.key,
      project_id: project.id,
      project_role: project.role,
      added_by: project.addedBy,
    },
  });
}

/** MIYO-0278: the hand-written ticket-assigned template. */
export async function sendTicketAssignmentEmail(
  email: string,
  ticket: {
    key: string;
    title: string;
    priority: string;
    dueDate?: string | null;
    projectName: string;
    projectId: number;
    assignedBy: string;
  },
) {
  await sendTemplateEmail("ticket-assigned", {
    to: email,
    category: "tasks",
    vars: {
      ticket_key: ticket.key,
      ticket_title: ticket.title,
      priority: ticket.priority.replace(/_/g, " ").toLowerCase(),
      due_date: ticket.dueDate?.trim() || "not set",
      project_name: ticket.projectName,
      project_id: ticket.projectId,
      assigned_by: ticket.assignedBy,
    },
  });
}

/** MIYO-0279: the hand-written ticket-review-request template. */
export async function sendTicketReviewRequestEmail(
  email: string,
  ticket: {
    key: string;
    title: string;
    projectName: string;
    projectId: number;
    requestedBy: string;
  },
) {
  await sendTemplateEmail("ticket-review-request", {
    to: email,
    category: "tasks",
    vars: {
      ticket_key: ticket.key,
      ticket_title: ticket.title,
      project_name: ticket.projectName,
      project_id: ticket.projectId,
      requested_by: ticket.requestedBy,
    },
  });
}

/** MIYO-0280: the hand-written ticket-changes-requested template. */
export async function sendTicketChangesRequestedEmail(
  email: string,
  ticket: {
    key: string;
    title: string;
    projectId: number;
    reviewerName: string;
    note?: string | null;
  },
) {
  const note = ticket.note?.trim() || "No note was added.";
  await sendTemplateEmail("ticket-changes-requested", {
    to: email,
    category: "tasks",
    vars: {
      ticket_key: ticket.key,
      ticket_title: ticket.title,
      project_id: ticket.projectId,
      reviewer_name: ticket.reviewerName,
      note,
      note_snippet: snippet(note),
    },
  });
}

/**
 * MIYO-0281, MIYO-0282: the hand-written ticket-comment and ticket-mention
 * templates. Someone named in a comment gets the mention version, everyone
 * else following the ticket gets the comment one.
 */
export async function sendTicketCommentEmail(
  recipients: string[],
  comment: {
    ticketKey: string;
    projectId: number;
    commentId: number;
    authorName: string;
    body: string;
    mention?: boolean;
  },
) {
  if (recipients.length === 0) return;
  await sendTemplateEmail(comment.mention ? "ticket-mention" : "ticket-comment", {
    to: recipients,
    category: "tasks",
    vars: {
      ticket_key: comment.ticketKey,
      project_id: comment.projectId,
      comment_id: comment.commentId,
      author_name: comment.authorName,
      comment_snippet: snippet(comment.body),
    },
  });
}
