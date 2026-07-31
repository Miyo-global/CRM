import { getEmailTemplate, escapeHtml, baseUrl } from "./base";

export type RecruitmentEmailEvent =
  | "job_created"
  | "job_published"
  | "job_deleted"
  | "applications_auto_closed"
  | "new_application";

export interface JobRecruitmentEmailParams {
  jobTitle: string;
  jobId: number;
  location?: string | null;
  jobType?: string | null;
  applicationDeadline?: string | null;
  actorName?: string | null;
  candidateName?: string | null;
  candidateEmail?: string | null;
  closedCount?: number;
  inAppLink?: string;
}

function jobDetailUrl(jobId: number) {
  return `${baseUrl}/hr/recruitment/jobs?jobId=${jobId}`;
}

function careersUrl(jobId: number, jobTitle: string) {
  const slug = jobTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${baseUrl}/careers/${jobId}/${slug || "job"}`;
}

function metaRows(params: JobRecruitmentEmailParams): string {
  const rows: string[] = [];
  if (params.location) {
    rows.push(`<div class="credential-item"><span class="credential-label">Location:</span><span class="credential-value">${escapeHtml(params.location)}</span></div>`);
  }
  if (params.jobType) {
    rows.push(`<div class="credential-item"><span class="credential-label">Type:</span><span class="credential-value">${escapeHtml(params.jobType.replace(/_/g, " "))}</span></div>`);
  }
  if (params.applicationDeadline) {
    rows.push(`<div class="credential-item"><span class="credential-label">Apply by:</span><span class="credential-value">${escapeHtml(params.applicationDeadline)}</span></div>`);
  }
  if (params.candidateName) {
    rows.push(`<div class="credential-item"><span class="credential-label">Candidate:</span><span class="credential-value">${escapeHtml(params.candidateName)}</span></div>`);
  }
  if (params.candidateEmail) {
    rows.push(`<div class="credential-item"><span class="credential-label">Email:</span><span class="credential-value">${escapeHtml(params.candidateEmail)}</span></div>`);
  }
  if (params.actorName) {
    rows.push(`<div class="credential-item"><span class="credential-label">By:</span><span class="credential-value">${escapeHtml(params.actorName)}</span></div>`);
  }
  return rows.length
    ? `<div class="credential-box">${rows.join("")}</div>`
    : "";
}

export function getRecruitmentHrEmail(
  event: RecruitmentEmailEvent,
  params: JobRecruitmentEmailParams,
): { subject: string; html: string } {
  const title = escapeHtml(params.jobTitle);
  const hrLink = jobDetailUrl(params.jobId);
  const meta = metaRows(params);

  let heading = "";
  let body = "";
  let preheader = "";
  let subject = "";

  switch (event) {
    case "job_created":
      heading = "New job posting created";
      subject = `Job created (draft): ${params.jobTitle}`;
      preheader = `A new draft job "${params.jobTitle}" was created`;
      body = `<p class="email-text">A new job posting has been created as a <strong>draft</strong> and is ready for review before publishing to the careers page.</p>`;
      break;
    case "job_published":
      heading = "Job posting published";
      subject = `Job published: ${params.jobTitle}`;
      preheader = `"${params.jobTitle}" is now live on the careers page`;
      body = `<p class="email-text">The job posting <strong>${title}</strong> is now <strong>live</strong> and accepting applications on the public careers page.</p>
        <p class="email-text"><a href="${escapeHtml(careersUrl(params.jobId, params.jobTitle))}">View public listing</a></p>`;
      break;
    case "job_deleted":
      heading = "Job posting deleted";
      subject = `Job deleted: ${params.jobTitle}`;
      preheader = `"${params.jobTitle}" was removed from recruitment`;
      body = `<p class="email-text">The job posting <strong>${title}</strong> has been permanently deleted from recruitment.</p>`;
      break;
    case "applications_auto_closed":
      heading = "Applications closed automatically";
      subject =
        params.closedCount && params.closedCount > 1
          ? `${params.closedCount} job postings closed — deadline passed`
          : `Applications closed: ${params.jobTitle}`;
      preheader = "Application deadline passed — job closed automatically";
      body = `<p class="email-text">The application deadline has passed for <strong>${title}</strong>. This posting was automatically closed and no longer accepts new applications.</p>`;
      break;
    case "new_application":
      heading = "New careers page application";
      subject = `New application: ${params.candidateName ?? "Candidate"} — ${params.jobTitle}`;
      preheader = `${params.candidateName ?? "Someone"} applied for ${params.jobTitle}`;
      body = `<p class="email-text">A candidate submitted an application via the public careers page for <strong>${title}</strong>.</p>`;
      break;
  }

  const content = `
    <h2 class="email-title">${heading}</h2>
    <p class="email-text">Job: <strong>${title}</strong></p>
    ${meta}
    ${body}
    <div style="text-align: center; margin-top: 24px;">
      <a href="${hrLink}" class="email-button">Open Recruitment</a>
    </div>
  `;

  return {
    subject: `${subject} — Miyo Global`,
    html: getEmailTemplate({ title: heading, preheader, content }),
  };
}

export interface ApplicationConfirmationParams {
  candidateName: string;
  jobTitle: string;
}

export interface CandidateStageEmailParams {
  candidateName: string;
  jobTitle: string;
  companyName?: string;
}

export interface InterviewInviteParams extends CandidateStageEmailParams {
  roundName: string;
  roundNumber: number;
  durationMinutes: number;
  mode: string;
}

export function getCandidateShortlistedEmail(
  params: CandidateStageEmailParams,
): { subject: string; html: string } {
  const name = escapeHtml(params.candidateName.trim() || "there");
  const title = escapeHtml(params.jobTitle);
  const company = escapeHtml(params.companyName ?? "Miyo Global");

  const content = `
    <h2 class="email-title">You've been shortlisted!</h2>
    <p class="email-text">Dear ${name}, great news — you've been shortlisted for the role of <strong>${title}</strong> at ${company}.</p>
    <p class="email-text">Our team was impressed with your profile and would like to move forward with your application. You'll receive details about the next steps in your interview process shortly.</p>
    <p class="email-text">Warm regards,<br/>Talent Acquisition · ${company}</p>
  `;

  return {
    subject: `You've been shortlisted for ${params.jobTitle} — ${company}`,
    html: getEmailTemplate({
      title: "You've been shortlisted!",
      preheader: `Great news — you've been shortlisted for ${params.jobTitle}.`,
      content,
    }),
  };
}

export function getCandidateInterviewInviteEmail(
  params: InterviewInviteParams,
): { subject: string; html: string } {
  const name = escapeHtml(params.candidateName.trim() || "there");
  const title = escapeHtml(params.jobTitle);
  const company = escapeHtml(params.companyName ?? "Miyo Global");
  const round = escapeHtml(params.roundName);
  const modeLabel = params.mode === "VIDEO" ? "Video call" : params.mode === "PHONE" ? "Phone call" : "On-site";

  const content = `
    <h2 class="email-title">Interview Invitation — Round ${params.roundNumber}</h2>
    <p class="email-text">Dear ${name}, we're pleased to invite you to the next stage of the selection process for <strong>${title}</strong> at ${company}.</p>
    <div class="credential-box">
      <div class="credential-item"><span class="credential-label">Round:</span><span class="credential-value">${round}</span></div>
      <div class="credential-item"><span class="credential-label">Format:</span><span class="credential-value">${modeLabel}</span></div>
      <div class="credential-item"><span class="credential-label">Duration:</span><span class="credential-value">${params.durationMinutes} minutes</span></div>
    </div>
    <p class="email-text">Our team will reach out with scheduling options. Please keep an eye on your inbox and feel free to suggest your preferred time slots by replying to this email.</p>
    <p class="email-text">Warm regards,<br/>Talent Acquisition · ${company}</p>
  `;

  return {
    subject: `Interview Invitation: ${params.roundName} — ${params.jobTitle}`,
    html: getEmailTemplate({
      title: `Interview Invitation — Round ${params.roundNumber}`,
      preheader: `You're invited to Round ${params.roundNumber}: ${params.roundName} for ${params.jobTitle}.`,
      content,
    }),
  };
}

export function getCandidateRejectionEmail(
  params: CandidateStageEmailParams,
): { subject: string; html: string } {
  const name = escapeHtml(params.candidateName.trim() || "there");
  const title = escapeHtml(params.jobTitle);
  const company = escapeHtml(params.companyName ?? "Miyo Global");

  const content = `
    <h2 class="email-title">Application Update</h2>
    <p class="email-text">Dear ${name}, thank you for the time and effort you invested in applying for <strong>${title}</strong> at ${company}.</p>
    <p class="email-text">After careful consideration, we've decided to move forward with other candidates whose experience more closely matches our current requirements. This was a difficult decision given the quality of applicants we received.</p>
    <p class="email-text">We appreciate your interest in joining our team and encourage you to apply for future openings that match your profile. We'll keep your details on file.</p>
    <p class="email-text">Warm regards,<br/>Talent Acquisition · ${company}</p>
  `;

  return {
    subject: `Application update for ${params.jobTitle} — ${company}`,
    html: getEmailTemplate({
      title: "Application Update",
      preheader: `An update regarding your application for ${params.jobTitle} at ${company}.`,
      content,
    }),
  };
}

export interface CandidateOfferEmailParams extends CandidateStageEmailParams {
  designation?: string | null;
  salary?: string | null;
  joiningDate?: string | null;
  validUntil?: string | null;
  acceptanceLink?: string | null;
}

export function getCandidateOfferEmail(
  params: CandidateOfferEmailParams,
): { subject: string; html: string } {
  const name = escapeHtml(params.candidateName.trim() || "there");
  const title = escapeHtml(params.jobTitle);
  const company = escapeHtml(params.companyName ?? "Miyo Global");
  const designation = params.designation ? escapeHtml(params.designation) : title;

  const detailRows = [
    params.designation ? `<div class="credential-item"><span class="credential-label">Designation:</span><span class="credential-value">${designation}</span></div>` : "",
    params.salary ? `<div class="credential-item"><span class="credential-label">Offered CTC:</span><span class="credential-value">${escapeHtml(params.salary)}</span></div>` : "",
    params.joiningDate ? `<div class="credential-item"><span class="credential-label">Joining Date:</span><span class="credential-value">${escapeHtml(params.joiningDate)}</span></div>` : "",
    params.validUntil ? `<div class="credential-item"><span class="credential-label">Offer Valid Until:</span><span class="credential-value">${escapeHtml(params.validUntil)}</span></div>` : "",
  ].filter(Boolean).join("\n");

  const ctaBlock = params.acceptanceLink
    ? `<div style="text-align:center;margin:24px 0"><a href="${escapeHtml(params.acceptanceLink)}" style="display:inline-block;background:#0f2b7f;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px">Review &amp; Accept Offer</a></div><p class="email-text" style="font-size:12px;color:#6b7280;text-align:center">Button not working? Copy this link: <a href="${escapeHtml(params.acceptanceLink)}" class="footer-link">${escapeHtml(params.acceptanceLink)}</a></p>`
    : "";

  const content = `
    <h2 class="email-title">Congratulations — Offer Extended!</h2>
    <p class="email-text">Dear ${name}, we are delighted to extend an offer of employment for the role of <strong>${designation}</strong> at ${company}.</p>
    ${detailRows.length ? `<div class="credential-box">${detailRows}</div>` : ""}
    ${ctaBlock}
    <p class="email-text">Please review the offer carefully and respond at your earliest convenience. We look forward to welcoming you to the team!</p>
    <p class="email-text">Warm regards,<br/>Talent Acquisition · ${company}</p>
  `;

  return {
    subject: `Offer Letter — ${designation} at ${company}`,
    html: getEmailTemplate({
      title: "Offer Extended!",
      preheader: `We're delighted to offer you the role of ${designation} at ${company}.`,
      content,
    }),
  };
}

export function getApplicationConfirmationEmail(
  params: ApplicationConfirmationParams,
): { subject: string; html: string } {
  const name = escapeHtml(params.candidateName.trim() || "there");
  const title = escapeHtml(params.jobTitle);

  const content = `
    <h2 class="email-title">Thank you for applying</h2>
    <p class="email-text">Dear ${name}, thank you for applying to the role of <strong>${title}</strong> at Miyo Global. We're excited that you're considering us as your next employer.</p>
    <div class="credential-box">
      <div class="credential-item"><span class="credential-label">Role:</span><span class="credential-value">${title}</span></div>
    </div>
    <p class="email-text">Our talent team will carefully review your profile within <strong>3 working days</strong>. If your background is a strong match for this role, we'll reach out to you with the next steps in our hiring process.</p>
    <p class="email-text">Have any questions in the meantime? Reach us at <a href="mailto:support@miyoglobal.com" class="footer-link">support@miyoglobal.com</a> and we'll be happy to help.</p>
    <p class="email-text">Warm regards,<br/>Talent Acquisition · Miyo Global</p>
  `;

  return {
    subject: `Application received: ${params.jobTitle} — Miyo Global`,
    html: getEmailTemplate({
      title: "Thank you for applying",
      preheader: `We've received your application for ${params.jobTitle}. We'll review it within 3 working days.`,
      content,
    }),
  };
}

export interface BookingConfirmationParams {
  candidateName: string;
  orgName: string;
  slotFormatted: string;
  durationMinutes: number;
  meetingLink?: string | null;
}

export function buildBookingConfirmationHtml(
  params: BookingConfirmationParams,
): { subject: string; html: string } {
  const name = escapeHtml(params.candidateName.trim() || "there");
  const org = escapeHtml(params.orgName);
  const slot = escapeHtml(params.slotFormatted);
  const duration = params.durationMinutes;

  const meetingRow = params.meetingLink
    ? `<div class="credential-item"><span class="credential-label">Meeting Link:</span><span class="credential-value"><a href="${escapeHtml(params.meetingLink)}" class="footer-link">${escapeHtml(params.meetingLink)}</a></span></div>`
    : "";

  const content = `
    <h2 class="email-title">Interview Confirmed</h2>
    <p class="email-text">Hi ${name}, your interview with <strong>${org}</strong> has been successfully scheduled. Here are your details:</p>
    <div class="credential-box">
      <div class="credential-item"><span class="credential-label">Date &amp; Time:</span><span class="credential-value">${slot}</span></div>
      <div class="credential-item"><span class="credential-label">Duration:</span><span class="credential-value">${duration} minutes</span></div>
      ${meetingRow}
    </div>
    <p class="email-text">Please make sure you are available at the scheduled time. If you need to reschedule, contact the hiring team as soon as possible.</p>
    <p class="email-text">Best of luck!<br/>Talent Acquisition · ${org}</p>
  `;

  return {
    subject: `Interview Confirmed — ${params.orgName}`,
    html: getEmailTemplate({
      title: "Interview Confirmed",
      preheader: `Your interview with ${params.orgName} is confirmed for ${params.slotFormatted}.`,
      content,
    }),
  };
}

export interface OfferResponseNotificationParams {
  hrName: string;
  candidateName: string;
  designation: string;
  decision: "ACCEPTED" | "DECLINED";
  notes?: string | null;
  orgName: string;
  candidateProfileUrl: string;
}

export function buildOfferResponseHrNotificationHtml(
  params: OfferResponseNotificationParams,
): { subject: string; html: string } {
  const hr = escapeHtml(params.hrName.trim() || "Team");
  const candidate = escapeHtml(params.candidateName);
  const designation = escapeHtml(params.designation);
  const org = escapeHtml(params.orgName);
  const isAccepted = params.decision === "ACCEPTED";
  const decisionLabel = isAccepted ? "Accepted" : "Declined";
  const notesRow = params.notes
    ? `<div class="credential-item"><span class="credential-label">Notes:</span><span class="credential-value">${escapeHtml(params.notes)}</span></div>`
    : "";

  const content = `
    <h2 class="email-title">Offer ${decisionLabel} — ${candidate}</h2>
    <p class="email-text">Hi ${hr}, <strong>${candidate}</strong> has <strong>${decisionLabel.toLowerCase()}</strong> the offer for <strong>${designation}</strong> at ${org}.</p>
    <div class="credential-box">
      <div class="credential-item"><span class="credential-label">Candidate:</span><span class="credential-value">${candidate}</span></div>
      <div class="credential-item"><span class="credential-label">Role:</span><span class="credential-value">${designation}</span></div>
      <div class="credential-item"><span class="credential-label">Decision:</span><span class="credential-value">${decisionLabel}</span></div>
      ${notesRow}
    </div>
    <div style="text-align:center;margin:24px 0"><a href="${escapeHtml(params.candidateProfileUrl)}" style="display:inline-block;background:#0f2b7f;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px">View Candidate Profile</a></div>
    <p class="email-text">Please update the candidate record and proceed with the next steps accordingly.</p>
    <p class="email-text">Recruitment Automation · ${org}</p>
  `;

  return {
    subject: `Offer ${decisionLabel}: ${candidate} — ${designation}`,
    html: getEmailTemplate({
      title: `Offer ${decisionLabel}`,
      preheader: `${candidate} has ${decisionLabel.toLowerCase()} the offer for ${designation}.`,
      content,
    }),
  };
}

export interface OfferDecisionConfirmationParams {
  candidateName: string;
  orgName: string;
  designation: string;
  decision: "ACCEPTED" | "DECLINED";
}

export function buildOfferDecisionConfirmationHtml(
  params: OfferDecisionConfirmationParams,
): { subject: string; html: string } {
  const name = escapeHtml(params.candidateName.trim() || "there");
  const org = escapeHtml(params.orgName);
  const designation = escapeHtml(params.designation);
  const isAccepted = params.decision === "ACCEPTED";

  const content = isAccepted
    ? `
      <h2 class="email-title">Welcome to the Team!</h2>
      <p class="email-text">Dear ${name}, congratulations! We're thrilled that you have accepted the offer for <strong>${designation}</strong> at ${org}.</p>
      <p class="email-text">Our HR team will be in touch shortly with your onboarding details, documentation requirements, and joining instructions. Please keep an eye on your inbox.</p>
      <p class="email-text">We look forward to having you with us. Welcome aboard!</p>
      <p class="email-text">Warm regards,<br/>Talent Acquisition · ${org}</p>
    `
    : `
      <h2 class="email-title">Offer Declined — Acknowledged</h2>
      <p class="email-text">Dear ${name}, we acknowledge your decision to decline the offer for <strong>${designation}</strong> at ${org}.</p>
      <p class="email-text">We appreciate the time you invested in our hiring process. We respect your decision and wish you all the best in your future endeavours.</p>
      <p class="email-text">If your circumstances change, we'd be happy to reconnect in the future.</p>
      <p class="email-text">Warm regards,<br/>Talent Acquisition · ${org}</p>
    `;

  return {
    subject: isAccepted
      ? `Welcome to ${org} — Offer Accepted`
      : `Offer Declined — We Wish You Well`,
    html: getEmailTemplate({
      title: isAccepted ? "Welcome Aboard!" : "Offer Declined",
      preheader: isAccepted
        ? `Congratulations! Your offer for ${designation} at ${org} has been confirmed.`
        : `We acknowledge your decision regarding the offer for ${designation}.`,
      content,
    }),
  };
}
