import { getEmailTemplate, escapeHtml } from "./base";

export function getProjectAssignmentEmailTemplate(
  memberName: string,
  projectName: string,
  projectKey: string,
  projectUrl: string,
  assignedBy?: string
): string {
  const sProject = escapeHtml(projectName);
  const sKey = escapeHtml(projectKey);
  const sAssignedBy = assignedBy ? escapeHtml(assignedBy) : undefined;
  const content = `
    <h2 class="email-title">📋 You've Been Added to a Project</h2>
    <p class="email-text">
      ${sAssignedBy ? `<strong>${sAssignedBy}</strong> has added you` : 'You have been added'}
      to the project <strong>${sProject}</strong>.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Project:</span>
        <span class="credential-value">${sProject}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Project Key:</span>
        <span class="credential-value">${sKey}</span>
      </div>
    </div>

    <p class="email-text">
      You can now view and contribute to this project. Access the project board to see tickets,
      sprints, and collaborate with your team.
    </p>

    <div style="text-align: center;">
      <a href="${projectUrl}" class="email-button">
        View Project
      </a>
    </div>

    <div class="divider"></div>

    <p class="email-text">
      <strong>What's Next:</strong>
    </p>
    <ul style="color: #475569; font-size: 15px; line-height: 1.8; margin: 16px 0;">
      <li>Review the project details and objectives</li>
      <li>Check your assigned tickets</li>
      <li>Collaborate with your team members</li>
      <li>Update ticket statuses as you progress</li>
    </ul>
  `;

  return getEmailTemplate({
    title: `Added to Project: ${sProject} - Miyo Global`,
    preheader: `You've been added to ${sProject}`,
    content,
  });
}

export function getTicketAssignmentEmailTemplate(
  assigneeName: string,
  ticketTitle: string,
  ticketType: string,
  ticketPriority: string,
  projectName: string,
  ticketUrl: string,
  createdBy: string,
  issueKey?: string,
): string {
  const priorityColors: Record<string, string> = {
    LOW: '#22c55e',
    MEDIUM: '#eab308',
    HIGH: '#f97316',
    URGENT: '#ef4444',
  };
  const typeColors: Record<string, string> = {
    BUG: '#ef4444',
    TASK: '#3b82f6',
    STORY: '#22c55e',
    EPIC: '#8b5cf6',
    SUBTASK: '#64748b',
  };

  const priorityColor = priorityColors[ticketPriority] || '#64748b';
  const typeColor = typeColors[ticketType] || '#64748b';
  const sTitle = escapeHtml(ticketTitle);
  const sProject = escapeHtml(projectName);
  const sAssignee = escapeHtml(assigneeName);
  const sCreatedBy = escapeHtml(createdBy);
  const sKey = issueKey ? escapeHtml(issueKey) : "";
  const keyPrefix = sKey ? `[${sKey}] ` : "";

  const content = `
    <p style="font-size:13px; color:#64748b; margin:0 0 8px 0; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">
      ${sProject}
    </p>
    <h2 style="font-size:22px; font-weight:600; color:#0f172a; margin:0 0 8px 0; line-height:1.35;">
      ${sKey ? `<span style="color:#0f2b7f; font-family:'Monaco','Courier New',monospace; font-weight:700;">${sKey}</span> &nbsp;·&nbsp; ` : ""}${sTitle}
    </h2>
    <p style="font-size:14px; color:#475569; margin:0 0 24px 0;">
      <strong style="color:#0f172a;">${sCreatedBy}</strong> assigned this issue to <strong style="color:#0f172a;">${sAssignee}</strong>.
    </p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e2e8f0; border-radius:6px; border-collapse:separate; margin:0 0 24px 0; font-size:14px;">
      <tr>
        <td style="padding:10px 16px; border-bottom:1px solid #e2e8f0; width:130px; color:#64748b; font-weight:500;">Type</td>
        <td style="padding:10px 16px; border-bottom:1px solid #e2e8f0; color:${typeColor}; font-weight:600;">${ticketType}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px; border-bottom:1px solid #e2e8f0; color:#64748b; font-weight:500;">Priority</td>
        <td style="padding:10px 16px; border-bottom:1px solid #e2e8f0; color:${priorityColor}; font-weight:600;">${ticketPriority}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px; border-bottom:1px solid #e2e8f0; color:#64748b; font-weight:500;">Status</td>
        <td style="padding:10px 16px; border-bottom:1px solid #e2e8f0; color:#0f172a; font-weight:600;">To Do</td>
      </tr>
      <tr>
        <td style="padding:10px 16px; border-bottom:1px solid #e2e8f0; color:#64748b; font-weight:500;">Assignee</td>
        <td style="padding:10px 16px; border-bottom:1px solid #e2e8f0; color:#0f172a; font-weight:500;">${sAssignee}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px; color:#64748b; font-weight:500;">Reporter</td>
        <td style="padding:10px 16px; color:#0f172a; font-weight:500;">${sCreatedBy}</td>
      </tr>
    </table>

    ${ticketPriority === 'URGENT' || ticketPriority === 'HIGH' ? `
    <p style="font-size:13px; color:#92400e; background:#fef3c7; border-left:3px solid #f59e0b; padding:10px 14px; margin:0 0 24px 0; border-radius:4px;">
      <strong>High priority.</strong> This issue is flagged for immediate attention.
    </p>
    ` : ''}

    <div style="margin:0 0 32px 0;">
      <a href="${ticketUrl}" class="email-button">
        View issue
      </a>
    </div>

    <p style="font-size:12px; color:#94a3b8; margin:0; line-height:1.6;">
      You are receiving this notification because you were assigned to this issue. Reply to comments and changes are tracked in the CRM.
    </p>
  `;

  return getEmailTemplate({
    title: `${keyPrefix}${sTitle} - Miyo Global`,
    preheader: `${sCreatedBy} assigned ${keyPrefix}${sTitle} to you`,
    content,
  });
}

export function getTicketReviewRequestEmailTemplate(
  reviewerName: string,
  ticketTitle: string,
  ticketType: string,
  projectName: string,
  ticketUrl: string,
  completedBy: string,
  comment?: string
): string {
  const sTitle = escapeHtml(ticketTitle);
  const sProject = escapeHtml(projectName);
  const sCompletedBy = escapeHtml(completedBy);
  const sComment = comment ? escapeHtml(comment) : undefined;

  const content = `
    <h2 class="email-title">👀 Ticket Ready for Your Review</h2>
    <p class="email-text">
      <strong>${sCompletedBy}</strong> has completed their work and moved a ticket to
      <span style="display: inline-block; background: #eab308; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 13px;">IN REVIEW</span>.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Ticket:</span>
        <span class="credential-value">${sTitle}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Project:</span>
        <span class="credential-value">${sProject}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Type:</span>
        <span class="credential-value">${ticketType}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Completed By:</span>
        <span class="credential-value">${sCompletedBy}</span>
      </div>
    </div>

    ${sComment ? `
    <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #1e293b; font-size: 14px;">💬 Latest Comment:</p>
      <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">${sComment}</p>
    </div>
    ` : ''}

    <div style="text-align: center;">
      <a href="${ticketUrl}" class="email-button">
        Review Work & Add Comments
      </a>
    </div>

    <div class="divider"></div>

    <p class="email-text">
      <strong>You can review:</strong>
    </p>
    <ul style="color: #475569; font-size: 15px; line-height: 1.8; margin: 16px 0;">
      <li>View all comments and work updates</li>
      <li>Check attached images, videos, and documents</li>
      <li>Review external links and deployments</li>
      <li>Add your feedback and comments</li>
      <li>Approve (mark as DONE) or request changes (back to IN_PROGRESS)</li>
    </ul>
  `;

  return getEmailTemplate({
    title: `Review Requested: ${sTitle} - Miyo Global`,
    preheader: `${sCompletedBy} completed work on ${sTitle} and needs your review`,
    content,
  });
}

export function getTicketChangesRequestedEmailTemplate(
  assigneeName: string,
  ticketTitle: string,
  projectName: string,
  ticketUrl: string,
  reviewerName: string,
  comment?: string
): string {
  const sTitle = escapeHtml(ticketTitle);
  const sProject = escapeHtml(projectName);
  const sReviewer = escapeHtml(reviewerName);
  const sComment = comment ? escapeHtml(comment) : undefined;

  const content = `
    <h2 class="email-title">🔄 Changes Requested on Your Ticket</h2>
    <p class="email-text">
      <strong>${sReviewer}</strong> has reviewed your work and moved the ticket back to
      <span style="display: inline-block; background: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 13px;">IN PROGRESS</span>.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Ticket:</span>
        <span class="credential-value">${sTitle}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Project:</span>
        <span class="credential-value">${sProject}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Reviewed By:</span>
        <span class="credential-value">${sReviewer}</span>
      </div>
    </div>

    ${sComment ? `
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #92400e; font-size: 14px;">💬 Review Feedback:</p>
      <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">${sComment}</p>
    </div>
    ` : ''}

    <div class="security-notice">
      <p class="security-text">
        <strong>Action Required:</strong> Please review the feedback, make the requested changes,
        and move the ticket back to IN_REVIEW when ready.
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${ticketUrl}" class="email-button">
        View Feedback & Update Ticket
      </a>
    </div>

    <div class="divider"></div>

    <p class="email-text">
      Check all comments in the CRM to understand what needs to be fixed or improved.
    </p>
  `;

  return getEmailTemplate({
    title: `Changes Requested: ${sTitle} - Miyo Global`,
    preheader: `${sReviewer} requested changes on ${sTitle}`,
    content,
  });
}

export function getTicketCommentEmailTemplate(
  recipientName: string,
  commenterName: string,
  ticketTitle: string,
  projectName: string,
  ticketUrl: string,
  commentContent: string,
  issueKey?: string,
): string {
  const sRecipient = escapeHtml(recipientName);
  const sCommenter = escapeHtml(commenterName);
  const sTitle = escapeHtml(ticketTitle);
  const sProject = escapeHtml(projectName);
  const sComment = escapeHtml(commentContent);
  const sKey = issueKey ? escapeHtml(issueKey) : "";
  const keyPrefix = sKey ? `[${sKey}] ` : "";

  const preview = sComment.length > 200 ? `${sComment.slice(0, 200)}…` : sComment;

  const content = `
    <p style="font-size:13px; color:#64748b; margin:0 0 8px 0; text-transform:uppercase; letter-spacing:0.5px; font-weight:600;">
      ${sProject}
    </p>
    <h2 style="font-size:20px; font-weight:600; color:#0f172a; margin:0 0 6px 0; line-height:1.35;">
      ${sKey ? `<span style="color:#0f2b7f; font-family:'Monaco','Courier New',monospace; font-weight:700;">${sKey}</span> &nbsp;·&nbsp; ` : ""}${sTitle}
    </h2>
    <p style="font-size:14px; color:#475569; margin:0 0 24px 0;">
      Hi <strong style="color:#0f172a;">${sRecipient}</strong>, <strong style="color:#0f172a;">${sCommenter}</strong> left a comment on this ticket.
    </p>

    <div style="background:#f8fafc; border-left:4px solid #6366f1; padding:16px 20px; margin:0 0 24px 0; border-radius:0 6px 6px 0;">
      <p style="margin:0 0 8px 0; font-size:12px; font-weight:600; color:#6366f1; text-transform:uppercase; letter-spacing:0.5px;">${sCommenter}</p>
      <p style="margin:0; font-size:14px; color:#334155; line-height:1.7; white-space:pre-wrap;">${preview}</p>
    </div>

    <div style="margin:0 0 32px 0;">
      <a href="${ticketUrl}" style="display:inline-block; background:#6366f1; color:#ffffff; font-size:14px; font-weight:600; text-decoration:none; padding:12px 24px; border-radius:6px;">
        View Comment &amp; Reply
      </a>
    </div>

    <p style="font-size:12px; color:#94a3b8; margin:0; line-height:1.6;">
      You are receiving this because you are assigned to or reported this ticket. To manage notifications, visit your profile settings.
    </p>
  `;

  return getEmailTemplate({
    title: `${keyPrefix}New comment on: ${sTitle} - Miyo Global`,
    preheader: `${sCommenter} commented on ${keyPrefix}${sTitle}`,
    content,
  });
}
