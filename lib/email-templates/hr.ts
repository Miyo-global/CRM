import { getEmailTemplate, baseUrl, escapeHtml } from "./base";
import { REJECTION_COOLDOWN_DAYS } from "@/lib/constants/recruitment";
import { CURRENCY_SYMBOL } from "@/lib/constants/locale";

export function getLeaveRequestEmailTemplate(
  approverName: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  reason: string,
  leaveUrl: string
): string {
  const sEmployee = escapeHtml(employeeName);
  const sLeaveType = escapeHtml(leaveType);
  const sReason = escapeHtml(reason);
  const content = `
    <h2 class="email-title">📅 New Leave Request</h2>
    <p class="email-text">
      <strong>${sEmployee}</strong> has submitted a new leave request that requires your approval.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Employee:</span>
        <span class="credential-value">${sEmployee}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Leave Type:</span>
        <span class="credential-value">${sLeaveType}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Duration:</span>
        <span class="credential-value">${startDate} to ${endDate}</span>
      </div>
    </div>

    <div style="background: #f8fafc; border-left: 4px solid #0f2b7f; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #1e293b; font-size: 14px;">💬 Reason:</p>
      <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">${sReason}</p>
    </div>

    <div style="text-align: center;">
      <a href="${leaveUrl}" class="email-button">
        Review Leave Request
      </a>
    </div>

    <div class="divider"></div>

    <p class="email-text">
      You can approve or reject this request directly from the HR portal.
    </p>
  `;

  return getEmailTemplate({
    title: `Leave Request: ${sEmployee} - Miyo Global`,
    preheader: `${sEmployee} requested ${sLeaveType} from ${startDate} to ${endDate}`,
    content,
  });
}

export function getWfhRequestEmailTemplate(
  approverName: string,
  employeeName: string,
  wfhDate: string,
  reason: string,
  reviewUrl: string
): string {
  const sEmployee = escapeHtml(employeeName);
  const sApprover = escapeHtml(approverName);
  const sReason = escapeHtml(reason || "");
  const content = `
    <h2 class="email-title">🏠 New Work From Home Request</h2>
    <p class="email-text">
      Hi <strong>${sApprover}</strong>,
    </p>
    <p class="email-text">
      <strong>${sEmployee}</strong> has submitted a work from home request that requires HR review.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Employee:</span>
        <span class="credential-value">${sEmployee}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">WFH date:</span>
        <span class="credential-value">${escapeHtml(wfhDate)}</span>
      </div>
    </div>

    <div style="background: #f8fafc; border-left: 4px solid #0f2b7f; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #1e293b; font-size: 14px;">Reason</p>
      <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">${sReason}</p>
    </div>

    <div style="text-align: center;">
      <a href="${reviewUrl}" class="email-button">
        Review WFH Request
      </a>
    </div>

    <div class="divider"></div>

    <p class="email-text">
      You can approve or reject this request from the Leaves &amp; WFH section in Miyo Global CRM.
    </p>
  `;

  return getEmailTemplate({
    title: `WFH Request: ${sEmployee} - Miyo Global`,
    preheader: `${sEmployee} requested WFH on ${wfhDate}`,
    content,
  });
}

export function getLeaveStatusUpdateEmailTemplate(
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  status: "APPROVED" | "REJECTED",
  approverName: string,
  rejectionReason?: string
): string {
  const isApproved = status === "APPROVED";
  const statusColor = isApproved ? "#22c55e" : "#ef4444";
  const sLeaveType = escapeHtml(leaveType);
  const sApprover = escapeHtml(approverName);
  const sRejection = rejectionReason ? escapeHtml(rejectionReason) : undefined;

  const content = `
    <h2 class="email-title">${isApproved ? "✅ Leave Request Approved" : "❌ Leave Request Rejected"}</h2>
    <p class="email-text">
      Your leave request for <strong>${sLeaveType}</strong> from <strong>${startDate} to ${endDate}</strong> has been <strong>${status.toLowerCase()}</strong> by ${sApprover}.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Status:</span>
        <span style="color: ${statusColor}; font-weight: 700; margin-left: 8px;">${status}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Leave Type:</span>
        <span class="credential-value">${sLeaveType}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Dates:</span>
        <span class="credential-value">${startDate} to ${endDate}</span>
      </div>
    </div>

    ${!isApproved && sRejection ? `
    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #991b1b; font-size: 14px;">💬 Reason for Rejection:</p>
      <p style="margin: 0; color: #b91c1c; font-size: 14px; line-height: 1.6;">${sRejection}</p>
    </div>
    ` : ''}

    <div class="divider"></div>

    <p class="email-text">
      Check your leave balances and request history in the HR portal.
    </p>
  `;

  return getEmailTemplate({
    title: `Leave Request ${status}: ${sLeaveType} - Miyo Global`,
    preheader: `Your leave request has been ${status.toLowerCase()}`,
    content,
  });
}

export function getLeaveCancellationEmailTemplate(
  approverName: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string
): string {
  const sEmployee = escapeHtml(employeeName);
  const sLeaveType = escapeHtml(leaveType);
  const content = `
    <h2 class="email-title">🚫 Leave Request Cancelled</h2>
    <p class="email-text">
      <strong>${sEmployee}</strong> has cancelled their previously submitted leave request.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Employee:</span>
        <span class="credential-value">${sEmployee}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Leave Type:</span>
        <span class="credential-value">${sLeaveType}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Duration:</span>
        <span class="credential-value">${startDate} to ${endDate}</span>
      </div>
    </div>

    <div class="divider"></div>

    <p class="email-text">
      This leave request has been withdrawn and no longer requires your action.
    </p>
  `;

  return getEmailTemplate({
    title: `Leave Cancelled: ${sEmployee} - Miyo Global`,
    preheader: `${sEmployee} cancelled their ${sLeaveType} request`,
    content,
  });
}

export interface LeaveEscalationRow {
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  submittedAt: string;
}

function buildLeaveEscalationTableRows(rows: LeaveEscalationRow[]): string {
  return rows
    .map(
      (row) => `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">${escapeHtml(row.employeeName)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">${escapeHtml(row.leaveType)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">${escapeHtml(row.startDate)} → ${escapeHtml(row.endDate)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">${escapeHtml(row.submittedAt)}</td>
        </tr>`,
    )
    .join("");
}

function buildLeaveEscalationTable(rows: LeaveEscalationRow[]): string {
  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">
      <thead>
        <tr style="background:#f8fafc;color:#555">
          <th style="padding:8px 10px;text-align:left">Employee</th>
          <th style="padding:8px 10px;text-align:left">Type</th>
          <th style="padding:8px 10px;text-align:left">Dates</th>
          <th style="padding:8px 10px;text-align:left">Submitted</th>
        </tr>
      </thead>
      <tbody>${buildLeaveEscalationTableRows(rows)}</tbody>
    </table>`;
}

export function getLeaveHrMissedEscalationEmailTemplate(
  hrName: string,
  orgName: string,
  rows: LeaveEscalationRow[],
  leaveUrl: string,
): string {
  const sHr = escapeHtml(hrName);
  const sOrg = escapeHtml(orgName);
  const count = rows.length;
  const content = `
    <h2 class="email-title">⚠️ Missed Leave Request${count > 1 ? "s" : ""}</h2>
    <p class="email-text">Dear <strong>${sHr}</strong>,</p>
    <p class="email-text">
      The following leave request${count > 1 ? "s have" : " has"} been pending at
      <strong>${sOrg}</strong> for <strong>more than 2 days</strong> without approval or rejection.
      You may have missed reviewing ${count > 1 ? "these" : "this"} — please take action now.
    </p>
    ${buildLeaveEscalationTable(rows)}
    <div style="text-align: center;">
      <a href="${leaveUrl}" class="email-button">Review Leave Requests</a>
    </div>
    <div class="divider"></div>
    <p class="email-text" style="font-size: 14px;">
      Employees are waiting for a decision. Approve or reject each request from the HR portal as soon as possible.
    </p>
  `;

  return getEmailTemplate({
    title: `[Action Required] ${count} Leave Request${count > 1 ? "s" : ""} Pending > 2 Days`,
    preheader: `You missed reviewing ${count} pending leave request${count > 1 ? "s" : ""}`,
    content,
  });
}

export function getLeaveCeoDelegateEscalationEmailTemplate(
  ceoName: string,
  orgName: string,
  rows: LeaveEscalationRow[],
  leaveUrl: string,
): string {
  const sCeo = escapeHtml(ceoName);
  const sOrg = escapeHtml(orgName);
  const count = rows.length;
  const content = `
    <h2 class="email-title">Leave Requests Need Attention</h2>
    <p class="email-text">Dear <strong>${sCeo}</strong>,</p>
    <p class="email-text">
      HR may be occupied at the moment. The following leave request${count > 1 ? "s are" : " is"} still
      pending at <strong>${sOrg}</strong> after more than <strong>2 days</strong>.
    </p>
    <p class="email-text">
      As CEO, you also have permission to approve and reject leave requests. Would you please review
      ${count > 1 ? "them" : "it"} if you are available?
    </p>
    ${buildLeaveEscalationTable(rows)}
    <div style="text-align: center;">
      <a href="${leaveUrl}" class="email-button">Review Leave Requests</a>
    </div>
    <div class="divider"></div>
    <p class="email-text" style="font-size: 14px;">
      This is an automated escalation from the Miyo Global HR system. HR has also been notified.
    </p>
  `;

  return getEmailTemplate({
    title: `[Escalation] ${count} Leave Request${count > 1 ? "s" : ""} Still Pending`,
    preheader: `HR is busy — ${count} leave request${count > 1 ? "s" : ""} awaiting action`,
    content,
  });
}

export function getResignationSubmittedEmailTemplate(
  hrName: string,
  employeeName: string,
  employeeDesignation: string,
  submissionDate: string,
  lastWorkingDate: string,
  noticePeriodDays: number,
  reason: string,
  reviewUrl: string
): string {
  const sHr = escapeHtml(hrName);
  const sEmployee = escapeHtml(employeeName);
  const sDesignation = escapeHtml(employeeDesignation);
  const sReason = escapeHtml(reason);

  const content = `
    <h2 class="email-title">📝 Resignation Submitted</h2>
    <p class="email-text">
      Dear <strong>${sHr}</strong>,
    </p>
    <p class="email-text">
      <strong>${sEmployee}</strong> has submitted a resignation letter that requires your review and action.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Employee:</span>
        <span class="credential-value">${sEmployee}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Designation:</span>
        <span class="credential-value">${sDesignation}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Submission Date:</span>
        <span class="credential-value">${submissionDate}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Notice Period:</span>
        <span class="credential-value">${noticePeriodDays} days</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Last Working Date:</span>
        <span class="credential-value" style="color: #dc2626; font-weight: 700;">${lastWorkingDate}</span>
      </div>
    </div>

    <div style="background: #f8fafc; border-left: 4px solid #0f2b7f; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #1e293b; font-size: 14px;">Reason for Resignation:</p>
      <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.7;">${sReason}</p>
    </div>

    <div style="text-align: center;">
      <a href="${reviewUrl}" class="email-button">
        Review Resignation
      </a>
    </div>

    <div class="divider"></div>

    <p class="email-text" style="font-size: 14px;">
      Please review and take the appropriate action (approve or reject) through the HR portal.
      The employee will be notified of your decision.
    </p>
  `;

  return getEmailTemplate({
    title: `Resignation Submitted: ${sEmployee} - Miyo Global`,
    preheader: `${sEmployee} has submitted a resignation. Last working date: ${lastWorkingDate}`,
    content,
  });
}

export function getResignationApprovedEmailTemplate(
  employeeName: string,
  approverName: string,
  lastWorkingDate: string,
  noticePeriodDays: number,
  submissionDate: string,
  portalUrl: string
): string {
  const sEmployee = escapeHtml(employeeName);
  const sApprover = escapeHtml(approverName);

  const content = `
    <h2 class="email-title">✅ Resignation Accepted</h2>
    <p class="email-text">
      Dear <strong>${sEmployee}</strong>,
    </p>
    <p class="email-text">
      We have received and accepted your resignation. This letter confirms the acceptance of your
      resignation submitted on <strong>${submissionDate}</strong>.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Approved By:</span>
        <span class="credential-value">${sApprover}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Notice Period:</span>
        <span class="credential-value">${noticePeriodDays} days</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Last Working Date:</span>
        <span class="credential-value" style="color: #0f2b7f; font-weight: 700;">${lastWorkingDate}</span>
      </div>
    </div>

    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #15803d; font-size: 14px;">Next Steps</p>
      <ul style="margin: 0; padding-left: 20px; color: #166534; font-size: 14px; line-height: 1.8;">
        <li>Complete all pending work and handover responsibilities before your last working day</li>
        <li>An exit interview will be scheduled before your last working date</li>
        <li>Return all company assets, access cards, and equipment on or before ${lastWorkingDate}</li>
        <li>Full &amp; Final settlement will be processed after your last working day</li>
        <li>Experience letter will be issued upon completion of exit formalities</li>
      </ul>
    </div>

    <div style="text-align: center;">
      <a href="${portalUrl}" class="email-button">
        View Exit Details
      </a>
    </div>

    <div class="divider"></div>

    <p class="email-text" style="font-size: 14px;">
      We appreciate your contributions to Miyo Global and wish you all the best in your future endeavours.
      If you have any questions regarding the exit process, please contact the HR department.
    </p>
  `;

  return getEmailTemplate({
    title: `Resignation Accepted - Miyo Global`,
    preheader: `Your resignation has been accepted. Last working date: ${lastWorkingDate}`,
    content,
  });
}

export function getTerminationEmailTemplate(
  employeeName: string,
  employeeDesignation: string,
  terminationDate: string,
  terminatedBy: string,
  reason: string,
  hrContactEmail: string
): string {
  const sEmployee = escapeHtml(employeeName);
  const sDesignation = escapeHtml(employeeDesignation);
  const sTerminatedBy = escapeHtml(terminatedBy);
  const sReason = escapeHtml(reason);
  const sHrEmail = escapeHtml(hrContactEmail);

  const content = `
    <h2 class="email-title">Employment Termination Notice</h2>
    <p class="email-text">
      Dear <strong>${sEmployee}</strong>,
    </p>
    <p class="email-text">
      This letter serves as formal notice that your employment with <strong>Miyo Global</strong>
      has been terminated effective the date stated below.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Employee Name:</span>
        <span class="credential-value">${sEmployee}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Designation:</span>
        <span class="credential-value">${sDesignation}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Effective Date:</span>
        <span class="credential-value" style="color: #dc2626; font-weight: 700;">${terminationDate}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Authorised By:</span>
        <span class="credential-value">${sTerminatedBy}</span>
      </div>
    </div>

    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #991b1b; font-size: 14px;">Reason:</p>
      <p style="margin: 0; color: #b91c1c; font-size: 14px; line-height: 1.7;">${sReason}</p>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; margin: 24px 0; border-radius: 8px;">
      <p style="margin: 0 0 12px 0; font-weight: 600; color: #1e293b; font-size: 14px;">Important Information</p>
      <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
        <li>All system access and company accounts will be revoked immediately</li>
        <li>Please return all company property, assets, and access cards on or before ${terminationDate}</li>
        <li>Your Full &amp; Final settlement will be processed within 30–45 working days</li>
        <li>Your experience letter will be issued upon completion of exit formalities</li>
        <li>All confidentiality and non-disclosure agreements remain in full effect</li>
      </ul>
    </div>

    <div class="divider"></div>

    <p class="email-text" style="font-size: 14px;">
      For queries regarding your final settlement, relieving letter, or any other matter,
      please contact HR at <a href="mailto:${sHrEmail}" style="color: #0f2b7f; text-decoration: none; font-weight: 500;">${sHrEmail}</a>.
    </p>
    <p class="email-text" style="font-size: 14px;">
      We thank you for your time and service with Miyo Global.
    </p>
  `;

  return getEmailTemplate({
    title: `Employment Termination Notice - Miyo Global`,
    preheader: `Your employment with Miyo Global has been terminated effective ${terminationDate}`,
    content,
  });
}

export function getDocumentExpiryReminderEmailTemplate(
  employeeName: string,
  documentName: string,
  documentType: string,
  expiryDate: string,
  daysRemaining: number
): string {
  const urgencyColor = daysRemaining <= 7 ? '#dc2626' : daysRemaining <= 14 ? '#f59e0b' : '#2563eb';
  const urgencyBg = daysRemaining <= 7 ? '#fee2e2' : daysRemaining <= 14 ? '#fef3c7' : '#dbeafe';
  const sEmployee = escapeHtml(employeeName);
  const sDocName = escapeHtml(documentName);
  const sDocType = escapeHtml(documentType);

  const content = `
    <h2 class="email-title">📋 Document Expiry Reminder</h2>
    <p class="email-text">
      Hello <strong>${sEmployee}</strong>,
    </p>

    <p class="email-text">
      This is a reminder that the following document is expiring soon:
    </p>

    <div class="credential-box" style="border-left-color: ${urgencyColor};">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Document:</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${sDocName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Type:</td>
          <td style="padding: 8px 0; color: #475569;">${sDocType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Expiry Date:</td>
          <td style="padding: 8px 0; color: ${urgencyColor}; font-weight: 700;">${expiryDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Time Remaining:</td>
          <td style="padding: 8px 0;"><span style="background: ${urgencyBg}; color: ${urgencyColor}; padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 13px;">${daysRemaining} days</span></td>
        </tr>
      </table>
    </div>

    <div class="divider"></div>

    <p class="email-text" style="font-size: 14px; color: #64748b;">
      Please ensure to renew or update this document before it expires to avoid any compliance issues.
    </p>
  `;

  return getEmailTemplate({
    title: `Document Expiring Soon: ${sDocName}`,
    preheader: `Your ${sDocType} expires in ${daysRemaining} days`,
    content,
  });
}


export function getCandidateRejectionEmail(params: {
  candidateName: string;
  jobTitle?: string;
  companyName: string;
  senderName?: string;
  attendedInterview?: boolean;
  notes?: string;
}): { subject: string; html: string } {
  const sCandidateName = escapeHtml(params.candidateName);
  const sCompanyName = escapeHtml(params.companyName);
  const sSenderName = params.senderName ? escapeHtml(params.senderName) : sCompanyName;

  const hasRole = !!params.jobTitle?.trim();
  const sJobTitle = hasRole ? escapeHtml(params.jobTitle!.trim()) : "";
  const roleClause = hasRole ? `the <strong>${sJobTitle}</strong> position` : "this position";

  const opening = params.attendedInterview
    ? `Thank you for taking the time to interview for ${roleClause} at <strong>${sCompanyName}</strong>.`
    : `Thank you for your interest in ${roleClause} at <strong>${sCompanyName}</strong> and for taking the time to apply.`;

  const content = `
    <p class="email-text">Dear ${sCandidateName},</p>
    <p class="email-text">${opening}</p>
    <p class="email-text">
      After careful consideration, we regret to inform you that we will not be moving
      forward with your application for ${roleClause} at this time.
    </p>
    ${params.notes ? `<p class="email-text" style="color: #475569;">${escapeHtml(params.notes)}</p>` : ""}
    <p class="email-text">
      You're welcome to apply for other roles at <strong>${sCompanyName}</strong> after a
      ${REJECTION_COOLDOWN_DAYS}-day waiting period.
    </p>
    <p class="email-text">
      We appreciate your interest in our organization and wish you all the best in your
      future endeavors.
    </p>
    <p class="email-text">
      Kind regards,<br/>
      <strong>${sSenderName}</strong><br/>
      ${sCompanyName}
    </p>
  `;

  const subject = hasRole
    ? `Update on your application — ${sJobTitle} at ${sCompanyName}`
    : `Update on your application at ${sCompanyName}`;

  return {
    subject,
    html: getEmailTemplate({ title: subject, preheader: "Thank you for applying", content }),
  };
}


export function getPayslipEmailTemplate(params: {
  employeeName: string;
  month: string;
  netSalary: string;
  orgName: string;
  payslipUrl?: string;
}): { subject: string; html: string } {
  const sName = escapeHtml(params.employeeName);
  const sMonth = escapeHtml(params.month);
  const sNet = escapeHtml(params.netSalary);
  const sOrg = escapeHtml(params.orgName);

  const content = `
    <p class="email-text">Dear <strong>${sName}</strong>,</p>
    <p class="email-text">
      Your payslip for <strong>${sMonth}</strong> has been processed and is attached to this email
      as a PDF. You can also view it anytime from the <strong>My Payslips</strong> section of your
      account.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
      <p style="margin:0;color:#166534;font-size:13px;">Net Salary — ${sMonth}</p>
      <p style="margin:6px 0 0 0;color:#166534;font-size:26px;font-weight:700;">${CURRENCY_SYMBOL}${sNet}</p>
    </div>
    ${
      params.payslipUrl
        ? `<p class="email-text"><a href="${escapeHtml(params.payslipUrl)}" class="email-button">View Payslip Online</a></p>`
        : ""
    }
    <p class="email-text">
      The PDF attachment contains your full salary breakdown including earnings, deductions, and bank
      transfer details. If you have any questions, please contact the HR department.
    </p>
    <p class="email-text">Best regards,<br/><strong>${sOrg} — HR Team</strong></p>
  `;

  const subject = `Your Payslip for ${sMonth} is Ready — ${sOrg}`;

  return {
    subject,
    html: getEmailTemplate({ title: "Your Payslip is Ready", preheader: `Net salary: ${CURRENCY_SYMBOL}${sNet}`, content }),
  };
}

export function getInterviewInviteEmail(params: {
  recipientName: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  scheduledAt: string;
  durationMinutes: number;
  format: string;
  meetingLink?: string;
  location?: string;
  notes?: string;
  
  recipientRole: "candidate" | "interviewer";
}): { subject: string; html: string } {
  const sRecipient = escapeHtml(params.recipientName);
  const sCandidate = escapeHtml(params.candidateName);
  const sJob = escapeHtml(params.jobTitle);
  const sCompany = escapeHtml(params.companyName);
  const sFormat = escapeHtml(params.format);
  const sDate = escapeHtml(params.scheduledAt);
  const sMeetLink = params.meetingLink ? escapeHtml(params.meetingLink) : null;
  const sLocation = params.location ? escapeHtml(params.location) : null;
  const sNotes = params.notes ? escapeHtml(params.notes) : null;

  const isCandidate = params.recipientRole === "candidate";
  const durationLabel =
    params.durationMinutes >= 60
      ? `${params.durationMinutes / 60}h`
      : `${params.durationMinutes}min`;

  const content = `
    <h2 class="email-title">📅 Interview Scheduled${isCandidate ? "" : " — Action Required"}</h2>
    <p class="email-text">Dear ${sRecipient},</p>
    <p class="email-text">
      ${
        isCandidate
          ? `We are pleased to invite you to interview for the <strong>${sJob}</strong> position at <strong>${sCompany}</strong>.`
          : `You have been assigned as an interviewer for <strong>${sCandidate}</strong> applying for the <strong>${sJob}</strong> role.`
      }
    </p>

    <div class="credential-box">
      ${
        !isCandidate
          ? `<div class="credential-item">
               <span class="credential-label">Candidate:</span>
               <span class="credential-value">${sCandidate}</span>
             </div>`
          : ""
      }
      <div class="credential-item">
        <span class="credential-label">Position:</span>
        <span class="credential-value">${sJob}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Date &amp; Time:</span>
        <span class="credential-value">${sDate}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Duration:</span>
        <span class="credential-value">${durationLabel}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Format:</span>
        <span class="credential-value">${sFormat}</span>
      </div>
      ${
        sMeetLink
          ? `<div class="credential-item">
               <span class="credential-label">Meeting Link:</span>
               <span class="credential-value"><a href="${sMeetLink}" style="color:#1e40af">${sMeetLink}</a></span>
             </div>`
          : ""
      }
      ${
        sLocation
          ? `<div class="credential-item">
               <span class="credential-label">Location:</span>
               <span class="credential-value">${sLocation}</span>
             </div>`
          : ""
      }
    </div>

    ${sNotes ? `<p class="email-text"><strong>Notes:</strong> ${sNotes}</p>` : ""}

    <p class="email-text">
      ${
        isCandidate
          ? "Please confirm your availability. If you need to reschedule, contact HR as soon as possible."
          : "Please review the candidate's profile and prepare your evaluation criteria before the interview."
      }
    </p>
  `;

  const subject = isCandidate
    ? `Interview Invitation — ${sJob} at ${sCompany}`
    : `Interview Assigned: ${sCandidate} — ${sJob}`;

  return {
    subject,
    html: getEmailTemplate({
      title: isCandidate ? "Interview Invitation" : "Interview Assigned",
      preheader: `${sFormat} interview on ${sDate} — ${durationLabel}`,
      content,
    }),
  };
}

export function getHolidayWorkRequestEmailToHr(params: {
  employeeName: string;
  employeeEmail: string | null;
  requestDate: string;
  dayLabel: string;
  reason: string;
  compensationPreference: "COMP_OFF" | "EXTRA_PAY";
  submittedAt: Date | string;
  orgName: string;
}): { subject: string; html: string } {
  const sName = escapeHtml(params.employeeName);
  const sEmail = params.employeeEmail ? escapeHtml(params.employeeEmail) : "";
  const sDate = escapeHtml(params.requestDate);
  const sDay = escapeHtml(params.dayLabel);
  const sReason = escapeHtml(params.reason);
  const sComp = params.compensationPreference === "COMP_OFF" ? "Compensatory off" : "Extra pay";
  const submittedAtStr =
    typeof params.submittedAt === "string"
      ? params.submittedAt
      : params.submittedAt.toISOString();
  const sSubmitted = escapeHtml(submittedAtStr);
  const sOrg = escapeHtml(params.orgName);
  const reviewUrl = `${baseUrl}/hr/attendance#holiday-work`;

  const content = `
    <p class="email-text">A team member has informed HR that they are working on a non-working day.</p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
      <table style="width:100%;font-size:13px;color:#0f172a;border-collapse:collapse;">
        <tr><td style="padding:4px 8px;color:#64748b;width:40%;">Employee</td><td style="padding:4px 8px;font-weight:600;">${sName}</td></tr>
        <tr><td style="padding:4px 8px;color:#64748b;">Email</td><td style="padding:4px 8px;">${sEmail}</td></tr>
        <tr><td style="padding:4px 8px;color:#64748b;">Date</td><td style="padding:4px 8px;font-weight:600;">${sDate} (${sDay})</td></tr>
        <tr><td style="padding:4px 8px;color:#64748b;">Compensation</td><td style="padding:4px 8px;">${sComp}</td></tr>
        <tr><td style="padding:4px 8px;color:#64748b;vertical-align:top;">Reason</td><td style="padding:4px 8px;">${sReason}</td></tr>
        <tr><td style="padding:4px 8px;color:#64748b;">Submitted at</td><td style="padding:4px 8px;font-family:monospace;font-size:12px;">${sSubmitted}</td></tr>
      </table>
    </div>

    <p class="email-text" style="margin-top:16px;">
      <a href="${reviewUrl}" style="background:#0f2b7f;color:#ffffff;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;display:inline-block;">
        Review request
      </a>
    </p>

    <p class="email-text" style="font-size:12px;color:#64748b;margin-top:16px;">
      Status is <strong>PENDING</strong> until you approve or reject from the HR Attendance page.
    </p>
    <p class="email-text" style="font-size:12px;color:#64748b;">— ${sOrg}</p>
  `;

  return {
    subject: `[Holiday Work] ${params.employeeName} — ${params.requestDate} (${params.dayLabel})`,
    html: getEmailTemplate({
      title: "Holiday work request",
      preheader: `${params.employeeName} requested to work on ${params.requestDate}`,
      content,
    }),
  };
}

