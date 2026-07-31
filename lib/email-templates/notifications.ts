import { getEmailTemplate, baseUrl, escapeHtml } from "./base";


export function getWorkLogApprovedEmailTemplate(
  employeeName: string,
  date: string,
  approverName: string
): string {
  const content = `
    <h2 class="email-title">✅ Work Log Approved</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(employeeName)}</strong>, your work log has been approved.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Date:</span>
        <span class="credential-value">${escapeHtml(date)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Approved by:</span>
        <span class="credential-value">${escapeHtml(approverName)}</span>
      </div>
    </div>
    <div style="text-align: center;">
      <a href="${baseUrl}/hr/work-logs" class="email-button">View Work Logs</a>
    </div>
  `;
  return getEmailTemplate({ title: "Work Log Approved", content });
}

export function getWorkLogRejectedEmailTemplate(
  employeeName: string,
  date: string,
  approverName: string,
  reason?: string
): string {
  const content = `
    <h2 class="email-title">❌ Work Log Rejected</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(employeeName)}</strong>, your work log has been rejected.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Date:</span>
        <span class="credential-value">${escapeHtml(date)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Rejected by:</span>
        <span class="credential-value">${escapeHtml(approverName)}</span>
      </div>
      ${reason ? `
      <div class="credential-item">
        <span class="credential-label">Reason:</span>
        <span class="credential-value">${escapeHtml(reason)}</span>
      </div>` : ""}
    </div>
    <p class="email-text">Please review and resubmit your work log.</p>
    <div style="text-align: center;">
      <a href="${baseUrl}/hr/work-logs" class="email-button">Update Work Log</a>
    </div>
  `;
  return getEmailTemplate({ title: "Work Log Rejected", content });
}


export function getOnboardingWelcomeEmailTemplate(
  employeeName: string,
  designation: string,
  joiningDate: string,
  taskCount: number
): string {
  const content = `
    <h2 class="email-title">🎉 Welcome to the Team!</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(employeeName)}</strong>, welcome aboard! We're excited to have you join us.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Role:</span>
        <span class="credential-value">${escapeHtml(designation)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Joining Date:</span>
        <span class="credential-value">${escapeHtml(joiningDate)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Onboarding Tasks:</span>
        <span class="credential-value">${taskCount} tasks to complete</span>
      </div>
    </div>
    <p class="email-text">
      Your onboarding tasks have been set up. Please log in to your dashboard to get started with your onboarding checklist.
    </p>
    <div style="text-align: center;">
      <a href="${baseUrl}/hr/onboarding/my-tasks" class="email-button">Start Onboarding</a>
    </div>
    <div class="security-notice">
      <p class="security-text">
        💡 If this is your first time logging in, you'll be prompted to change your temporary password.
      </p>
    </div>
  `;
  return getEmailTemplate({ title: "Welcome to Miyo Global", preheader: "Your onboarding journey starts now!", content });
}

export function getOnboardingTaskEmailTemplate(
  recipientName: string,
  employeeName: string,
  taskRole: string,
  taskCount: number
): string {
  const roleLabel = taskRole === "IT" ? "IT Setup" : taskRole === "HR" ? "HR" : "Manager";
  const content = `
    <h2 class="email-title">📋 Onboarding Tasks Assigned</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(recipientName)}</strong>, new onboarding tasks have been assigned to you.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">New Employee:</span>
        <span class="credential-value">${escapeHtml(employeeName)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Your Role:</span>
        <span class="credential-value">${roleLabel}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Tasks Assigned:</span>
        <span class="credential-value">${taskCount}</span>
      </div>
    </div>
    <div style="text-align: center;">
      <a href="${baseUrl}/hr/onboarding" class="email-button">View Onboarding Tasks</a>
    </div>
  `;
  return getEmailTemplate({ title: "Onboarding Tasks Assigned", content });
}


export function getTicketCreatedEmailTemplate(
  assigneeName: string,
  ticketTitle: string,
  priority: string,
  creatorName: string,
  ticketId: number
): string {
  const priorityColor = priority === "URGENT" ? "#dc2626" : priority === "HIGH" ? "#ea580c" : priority === "MEDIUM" ? "#ca8a04" : "#65a30d";
  const content = `
    <h2 class="email-title">🎫 New Support Ticket Assigned</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(assigneeName)}</strong>, a new support ticket has been assigned to you.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Ticket:</span>
        <span class="credential-value">#${ticketId} — ${escapeHtml(ticketTitle)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Priority:</span>
        <span class="credential-value" style="color: ${priorityColor}; font-weight: 600;">${escapeHtml(priority)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Created by:</span>
        <span class="credential-value">${escapeHtml(creatorName)}</span>
      </div>
    </div>
    <div style="text-align: center;">
      <a href="${baseUrl}/support/${ticketId}" class="email-button">View Ticket</a>
    </div>
  `;
  return getEmailTemplate({ title: "Support Ticket Assigned", content });
}

export function getTicketReplyEmailTemplate(
  recipientName: string,
  ticketTitle: string,
  ticketId: number,
  authorName: string,
  messagePreview: string
): string {
  const content = `
    <h2 class="email-title">💬 New Reply on Ticket #${ticketId}</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(recipientName)}</strong>, there's a new reply on your support ticket.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Ticket:</span>
        <span class="credential-value">${escapeHtml(ticketTitle)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Reply from:</span>
        <span class="credential-value">${escapeHtml(authorName)}</span>
      </div>
    </div>
    <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="color: #475569; font-size: 14px; margin: 0; font-style: italic;">"${escapeHtml(messagePreview.slice(0, 200))}${messagePreview.length > 200 ? "..." : ""}"</p>
    </div>
    <div style="text-align: center;">
      <a href="${baseUrl}/support/${ticketId}" class="email-button">View Full Conversation</a>
    </div>
  `;
  return getEmailTemplate({ title: "New Reply on Support Ticket", content });
}

export function getTicketStatusEmailTemplate(
  recipientName: string,
  ticketTitle: string,
  ticketId: number,
  newStatus: string,
  updatedBy: string
): string {
  const statusColor = newStatus === "RESOLVED" || newStatus === "CLOSED" ? "#16a34a" : newStatus === "IN_PROGRESS" ? "#2563eb" : "#ca8a04";
  const content = `
    <h2 class="email-title">🔄 Ticket Status Updated</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(recipientName)}</strong>, the status of your support ticket has been updated.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Ticket:</span>
        <span class="credential-value">#${ticketId} — ${escapeHtml(ticketTitle)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">New Status:</span>
        <span class="credential-value" style="color: ${statusColor}; font-weight: 600;">${escapeHtml(newStatus)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Updated by:</span>
        <span class="credential-value">${escapeHtml(updatedBy)}</span>
      </div>
    </div>
    <div style="text-align: center;">
      <a href="${baseUrl}/support/${ticketId}" class="email-button">View Ticket</a>
    </div>
  `;
  return getEmailTemplate({ title: "Ticket Status Updated", content });
}


export function getTaskAssignedEmailTemplate(
  assigneeName: string,
  taskTitle: string,
  taskType: string,
  dueDate: string | null,
  creatorName: string,
  entityLabel?: string
): string {
  const content = `
    <h2 class="email-title">📌 New Task Assigned</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(assigneeName)}</strong>, a new task has been assigned to you.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Task:</span>
        <span class="credential-value">${escapeHtml(taskTitle)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Type:</span>
        <span class="credential-value">${escapeHtml(taskType)}</span>
      </div>
      ${dueDate ? `
      <div class="credential-item">
        <span class="credential-label">Due Date:</span>
        <span class="credential-value">${escapeHtml(dueDate)}</span>
      </div>` : ""}
      ${entityLabel ? `
      <div class="credential-item">
        <span class="credential-label">Related to:</span>
        <span class="credential-value">${escapeHtml(entityLabel)}</span>
      </div>` : ""}
      <div class="credential-item">
        <span class="credential-label">Assigned by:</span>
        <span class="credential-value">${escapeHtml(creatorName)}</span>
      </div>
    </div>
    <div style="text-align: center;">
      <a href="${baseUrl}/crm/tasks" class="email-button">View Tasks</a>
    </div>
  `;
  return getEmailTemplate({ title: "New Task Assigned", content });
}


export function getDealStageChangeEmailTemplate(
  recipientName: string,
  dealName: string,
  previousStage: string,
  newStage: string,
  dealValue: string | null,
  changedBy: string,
  dealId: number
): string {
  const stageColor = newStage === "WON" ? "#16a34a" : newStage === "LOST" ? "#dc2626" : "#2563eb";
  const content = `
    <h2 class="email-title">${newStage === "WON" ? "🎉" : newStage === "LOST" ? "😞" : "📊"} Deal Stage Updated</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(recipientName)}</strong>, a deal stage has been updated.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Deal:</span>
        <span class="credential-value">${escapeHtml(dealName)}</span>
      </div>
      ${dealValue ? `
      <div class="credential-item">
        <span class="credential-label">Value:</span>
        <span class="credential-value">₹${escapeHtml(dealValue)}</span>
      </div>` : ""}
      <div class="credential-item">
        <span class="credential-label">Stage:</span>
        <span class="credential-value">${escapeHtml(previousStage)} → <strong style="color: ${stageColor};">${escapeHtml(newStage)}</strong></span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Updated by:</span>
        <span class="credential-value">${escapeHtml(changedBy)}</span>
      </div>
    </div>
    <div style="text-align: center;">
      <a href="${baseUrl}/crm/deals/${dealId}" class="email-button">View Deal</a>
    </div>
  `;
  return getEmailTemplate({ title: `Deal ${newStage === "WON" ? "Won" : newStage === "LOST" ? "Lost" : "Updated"}`, content });
}


export function getLeadAssignedEmailTemplate(
  repName: string,
  leadName: string,
  source: string,
  priority: string,
  assignedBy: string
): string {
  const priorityColor = priority === "HOT" ? "#dc2626" : priority === "WARM" ? "#ea580c" : "#65a30d";
  const content = `
    <h2 class="email-title">🎯 New Lead Assigned</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(repName)}</strong>, a new lead has been assigned to you.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Lead Name:</span>
        <span class="credential-value">${escapeHtml(leadName)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Source:</span>
        <span class="credential-value">${escapeHtml(source)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Priority:</span>
        <span class="credential-value" style="color: ${priorityColor}; font-weight: 600;">${escapeHtml(priority)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Assigned by:</span>
        <span class="credential-value">${escapeHtml(assignedBy)}</span>
      </div>
    </div>
    <div style="text-align: center;">
      <a href="${baseUrl}/crm/leads" class="email-button">View Leads</a>
    </div>
  `;
  return getEmailTemplate({ title: "New Lead Assigned", content });
}


export function getReviewAssignedEmailTemplate(
  employeeName: string,
  reviewerName: string,
  periodStart: string,
  periodEnd: string
): string {
  const content = `
    <h2 class="email-title">📝 Performance Review Assigned</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(employeeName)}</strong>, a performance review has been initiated for you.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Reviewer:</span>
        <span class="credential-value">${escapeHtml(reviewerName)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Review Period:</span>
        <span class="credential-value">${escapeHtml(periodStart)} to ${escapeHtml(periodEnd)}</span>
      </div>
    </div>
    <div style="text-align: center;">
      <a href="${baseUrl}/hr/performance" class="email-button">View Review</a>
    </div>
  `;
  return getEmailTemplate({ title: "Performance Review Assigned", content });
}


export function getOnboardingCompleteEmployeeEmailTemplate(
  employeeName: string
): string {
  const content = `
    <h2 class="email-title">🎉 Onboarding Complete!</h2>
    <p class="email-text">
      Congratulations <strong>${escapeHtml(employeeName)}</strong>, you've completed all your onboarding tasks!
    </p>
    <p class="email-text">
      Your onboarding journey is now complete. You're all set to get started with your day-to-day work.
      If you have any questions, don't hesitate to reach out to your manager or HR.
    </p>
    <div style="text-align: center;">
      <a href="${baseUrl}/hr/onboarding/my-tasks" class="email-button">View Dashboard</a>
    </div>
  `;
  return getEmailTemplate({ title: "Onboarding Complete", preheader: "You're all set!", content });
}

export function getOnboardingCompleteHrEmailTemplate(
  hrName: string,
  employeeName: string
): string {
  const content = `
    <h2 class="email-title">✅ Onboarding Complete</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(hrName)}</strong>, <strong>${escapeHtml(employeeName)}</strong> has completed all onboarding tasks.
    </p>
    <div style="text-align: center;">
      <a href="${baseUrl}/hr/onboarding" class="email-button">View Onboarding</a>
    </div>
  `;
  return getEmailTemplate({ title: "Onboarding Complete", content });
}


export function getHelpdeskTicketEmailTemplate(
  recipientName: string,
  ticketTitle: string,
  category: string,
  priority: string,
  creatorName: string
): string {
  const priorityColor = priority === "URGENT" ? "#dc2626" : priority === "HIGH" ? "#ea580c" : priority === "MEDIUM" ? "#ca8a04" : "#65a30d";
  const content = `
    <h2 class="email-title">🎫 New Helpdesk Ticket</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(recipientName)}</strong>, a new helpdesk ticket has been submitted.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Title:</span>
        <span class="credential-value">${escapeHtml(ticketTitle)}</span>
      </div>
      ${category ? `
      <div class="credential-item">
        <span class="credential-label">Category:</span>
        <span class="credential-value">${escapeHtml(category)}</span>
      </div>` : ""}
      <div class="credential-item">
        <span class="credential-label">Priority:</span>
        <span class="credential-value" style="color: ${priorityColor}; font-weight: 600;">${escapeHtml(priority)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Submitted by:</span>
        <span class="credential-value">${escapeHtml(creatorName)}</span>
      </div>
    </div>
    <div style="text-align: center;">
      <a href="${baseUrl}/hr/helpdesk" class="email-button">View Ticket</a>
    </div>
  `;
  return getEmailTemplate({ title: "New Helpdesk Ticket", content });
}


export function getAssetAssignedEmailTemplate(
  employeeName: string,
  assetName: string,
  assetType: string,
  serialNumber: string | null
): string {
  const content = `
    <h2 class="email-title">💻 Asset Assigned to You</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(employeeName)}</strong>, a company asset has been assigned to you.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Asset:</span>
        <span class="credential-value">${escapeHtml(assetName)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Type:</span>
        <span class="credential-value">${escapeHtml(assetType)}</span>
      </div>
      ${serialNumber ? `
      <div class="credential-item">
        <span class="credential-label">Serial Number:</span>
        <span class="credential-value">${escapeHtml(serialNumber)}</span>
      </div>` : ""}
    </div>
    <p class="email-text">
      Please take care of this equipment. Report any issues to IT or HR.
    </p>
    <div style="text-align: center;">
      <a href="${baseUrl}/hr/my-assets" class="email-button">View My Assets</a>
    </div>
  `;
  return getEmailTemplate({ title: "Asset Assigned", content });
}


export function getAssetAssignedHrNotificationTemplate(
  hrName: string,
  assignerName: string,
  employeeName: string,
  assetName: string,
  assetType: string,
  serialNumber: string | null,
  assignedAt: string
): string {
  const content = `
    <h2 class="email-title">📦 Asset Assignment Notification</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(hrName)}</strong>, an asset has been assigned to an employee.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Asset:</span>
        <span class="credential-value">${escapeHtml(assetName)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Type:</span>
        <span class="credential-value">${escapeHtml(assetType)}</span>
      </div>
      ${serialNumber ? `
      <div class="credential-item">
        <span class="credential-label">Serial Number:</span>
        <span class="credential-value">${escapeHtml(serialNumber)}</span>
      </div>` : ""}
      <div class="credential-item">
        <span class="credential-label">Assigned To:</span>
        <span class="credential-value">${escapeHtml(employeeName)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Assigned By:</span>
        <span class="credential-value">${escapeHtml(assignerName)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Date &amp; Time:</span>
        <span class="credential-value">${escapeHtml(assignedAt)}</span>
      </div>
    </div>
    <div style="text-align: center;">
      <a href="${baseUrl}/hr/assets" class="email-button">View Assets</a>
    </div>
  `;
  return getEmailTemplate({ title: "Asset Assignment Notification", content });
}

const RECOGNITION_CATEGORY_LABEL: Record<string, string> = {
  KUDOS: "🙌 Kudos",
  TEAMWORK: "🤝 Teamwork",
  INNOVATION: "💡 Innovation",
  LEADERSHIP: "🏆 Leadership",
  ABOVE_AND_BEYOND: "⭐ Above & Beyond",
};

function avatarHtml(name: string, imageUrl: string | null): string {
  if (imageUrl) {
    return `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name)}" width="96" height="96" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:3px solid #e2e8f0;display:block;margin:0 auto 12px;" />`;
  }
  const initials = name.split(" ").slice(0, 2).map((p) => p[0] ?? "").join("").toUpperCase() || "?";
  return `<div style="width:96px;height:96px;border-radius:50%;background:linear-gradient(135deg,#0f2b7f,#1e40af);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:32px;font-weight:700;color:#fff;line-height:96px;text-align:center;">${escapeHtml(initials)}</div>`;
}

export function getRecognitionRecipientEmailTemplate(
  recipientName: string,
  senderName: string,
  category: string,
  message: string,
  senderImageUrl: string | null
): string {
  const categoryLabel = RECOGNITION_CATEGORY_LABEL[category] ?? category;
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      ${avatarHtml(senderName, senderImageUrl)}
      <p style="margin:0;font-size:13px;color:#64748b;">From <strong>${escapeHtml(senderName)}</strong></p>
    </div>
    <h2 class="email-title" style="text-align:center;">You've been recognised! 🎉</h2>
    <p class="email-text" style="text-align:center;">
      Hi <strong>${escapeHtml(recipientName)}</strong>, ${escapeHtml(senderName)} just gave you a recognition.
    </p>
    <div class="credential-box" style="text-align:center;">
      <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0f2b7f;">${escapeHtml(categoryLabel)}</p>
      <p style="margin:0;font-size:15px;color:#334155;font-style:italic;">"${escapeHtml(message)}"</p>
    </div>
    <div style="text-align:center;">
      <a href="${baseUrl}/hr/recognition" class="email-button">View Recognition Wall</a>
    </div>
  `;
  return getEmailTemplate({ title: "You've been recognised!", content });
}

export function getRecognitionShoutoutEmailTemplate(
  viewerName: string,
  recipientName: string,
  recipientImageUrl: string | null,
  senderName: string,
  category: string,
  message: string
): string {
  const categoryLabel = RECOGNITION_CATEGORY_LABEL[category] ?? category;
  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      ${avatarHtml(recipientName, recipientImageUrl)}
      <p style="margin:0;font-size:20px;font-weight:700;color:#0f172a;">${escapeHtml(recipientName)}</p>
    </div>
    <h2 class="email-title" style="text-align:center;">Team Shoutout 🎉</h2>
    <p class="email-text" style="text-align:center;">
      Hi <strong>${escapeHtml(viewerName)}</strong>, ${escapeHtml(senderName)} just recognised <strong>${escapeHtml(recipientName)}</strong>!
    </p>
    <div class="credential-box" style="text-align:center;">
      <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0f2b7f;">${escapeHtml(categoryLabel)}</p>
      <p style="margin:0;font-size:15px;color:#334155;font-style:italic;">"${escapeHtml(message)}"</p>
    </div>
    <div style="text-align:center;">
      <a href="${baseUrl}/hr/recognition" class="email-button">See Recognition Wall</a>
    </div>
  `;
  return getEmailTemplate({ title: `${recipientName} was recognised — Team Shoutout`, content });
}

export function getPayrollApprovedEmailTemplate(
  employeeName: string,
  month: string,
  approverName: string
): string {
  const content = `
    <h2 class="email-title">✅ Payroll Approved</h2>
    <p class="email-text">
      Hi <strong>${escapeHtml(employeeName)}</strong>, your payroll for <strong>${escapeHtml(month)}</strong> has been approved and is being processed.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Month:</span>
        <span class="credential-value">${escapeHtml(month)}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Approved by:</span>
        <span class="credential-value">${escapeHtml(approverName)}</span>
      </div>
    </div>
    <p class="email-text">
      Your payslip will be available once payment is processed.
    </p>
    <div style="text-align: center;">
      <a href="${baseUrl}/hr/my-payslips" class="email-button">View Payslips</a>
    </div>
  `;
  return getEmailTemplate({ title: "Payroll Approved", content });
}
