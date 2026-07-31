import { getEmailTemplate, baseUrl, escapeHtml } from "./base";

export function getSelfReviewReminderEmail(
  employeeName: string,
  reviewCycle: string,
  dueDate: string,
  reviewUrl: string
): string {
  const sName = escapeHtml(employeeName);
  const sCycle = escapeHtml(reviewCycle);
  const content = `
    <h2 class="email-title">📝 Self-Review Reminder</h2>
    <p class="email-text">Hi <strong>${sName}</strong>,</p>
    <p class="email-text">
      Your self-review for <strong>${sCycle}</strong> is due on <strong>${dueDate}</strong>.
      Please take a few moments to reflect on your achievements, growth areas, and goals.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${reviewUrl}" class="email-button">Start Self-Review</a>
    </div>
    <p class="email-text" style="font-size:13px;color:#64748b;">
      This review helps your manager understand your perspective and ensure a fair evaluation.
    </p>
  `;
  return getEmailTemplate({
    title: `Self-Review Due: ${reviewCycle}`,
    preheader: `Your ${reviewCycle} self-review is due on ${dueDate}`,
    content,
  });
}

export function getManagerReviewReminderEmail(
  managerName: string,
  pendingCount: number,
  reviewCycle: string,
  reviewUrl: string
): string {
  const sName = escapeHtml(managerName);
  const sCycle = escapeHtml(reviewCycle);
  const content = `
    <h2 class="email-title">📋 Pending Reviews Reminder</h2>
    <p class="email-text">Hi <strong>${sName}</strong>,</p>
    <p class="email-text">
      You have <strong>${pendingCount} pending review${pendingCount > 1 ? "s" : ""}</strong> to complete for the <strong>${sCycle}</strong> performance cycle.
    </p>
    <p class="email-text">
      Timely reviews help your team members receive constructive feedback and plan their growth effectively.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${reviewUrl}" class="email-button">Complete Reviews</a>
    </div>
  `;
  return getEmailTemplate({
    title: `${pendingCount} Pending Reviews — ${reviewCycle}`,
    preheader: `You have ${pendingCount} pending performance reviews to complete`,
    content,
  });
}

export function getReviewPublishedEmail(
  employeeName: string,
  reviewCycle: string,
  overallRating: string,
  reviewUrl: string
): string {
  const sName = escapeHtml(employeeName);
  const sCycle = escapeHtml(reviewCycle);
  const sRating = escapeHtml(overallRating);
  const content = `
    <h2 class="email-title">🎯 Your Performance Review is Ready</h2>
    <p class="email-text">Hi <strong>${sName}</strong>,</p>
    <p class="email-text">
      Your performance review for <strong>${sCycle}</strong> has been published.
    </p>
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Review Cycle:</span>
        <span class="credential-value">${sCycle}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Overall Rating:</span>
        <span class="credential-value">${sRating}</span>
      </div>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${reviewUrl}" class="email-button">View My Review</a>
    </div>
  `;
  return getEmailTemplate({
    title: `Your ${reviewCycle} Review is Published`,
    preheader: `Your performance review is now available to view`,
    content,
  });
}

export function getGoalSettingReminderEmail(
  employeeName: string,
  quarter: string,
  dueDate: string,
  goalsUrl: string
): string {
  const sName = escapeHtml(employeeName);
  const sQuarter = escapeHtml(quarter);
  const content = `
    <h2 class="email-title">🎯 Set Your ${sQuarter} Goals</h2>
    <p class="email-text">Hi <strong>${sName}</strong>,</p>
    <p class="email-text">
      It's time to set your goals for <strong>${sQuarter}</strong>. Please submit your goals by <strong>${dueDate}</strong>.
    </p>
    <p class="email-text">
      Clear goals help align your work with team objectives and ensure a productive quarter.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${goalsUrl}" class="email-button">Set My Goals</a>
    </div>
  `;
  return getEmailTemplate({
    title: `Set Your ${quarter} Goals`,
    preheader: `Goal setting for ${quarter} is open — deadline: ${dueDate}`,
    content,
  });
}

export function getUnsatisfactoryPerformanceNoticeEmail(
  employeeName: string,
  periodStartLabel: string,
  periodEndLabel: string,
  performanceAreaLabel: string,
  revisedMonthlySalary: string
): string {
  const n = escapeHtml(employeeName);
  const ps = escapeHtml(periodStartLabel);
  const pe = escapeHtml(periodEndLabel);
  const area = escapeHtml(performanceAreaLabel);
  const salary = escapeHtml(revisedMonthlySalary);
  const content = `
    <h2 class="email-title">Notice regarding unsatisfactory performance</h2>
    <p class="email-text">Dear <strong>${n}</strong>,</p>
    <p class="email-text">
      This is to formally notify you that your performance over the past period
      (from <strong>${ps}</strong> to <strong>${pe}</strong>) has been below the expected standards.
    </p>
    <p class="email-text">
      Despite being provided with adequate time, support, and clear targets, you have not met
      <strong>${area}</strong>. This is a matter of serious concern and cannot be overlooked.
    </p>
    <p class="email-text">
      As per the terms discussed at the time of your joining, the initial evaluation period was
      considered a full salary period. Upon completion of this period, due to your failure to meet
      the required performance benchmarks, your compensation will now be revised to a basic salary of
      <strong>${salary}</strong> per month, effective immediately.
    </p>
    <p class="email-text">
      You are hereby advised to show immediate and measurable improvement in your performance.
      Failure to meet targets going forward may result in further strict action, which may include a
      Performance Improvement Plan (PIP) or other disciplinary measures.
    </p>
    <p class="email-text">
      Consider this an official warning. Your performance will be closely monitored on a daily basis.
    </p>
    <p class="email-text">For any clarification, you may contact your reporting manager.</p>
  `;
  return getEmailTemplate({
    title: "Notice regarding unsatisfactory performance",
    preheader: `Formal notice — performance and compensation revision for ${employeeName}`,
    content,
  });
}

export function getAppraisalStageAssignedEmail(
  recipientName: string,
  stageLabel: string,
  employeeName: string,
  actionUrl: string
): string {
  const rn = escapeHtml(recipientName);
  const sl = escapeHtml(stageLabel);
  const en = escapeHtml(employeeName);
  const content = `
    <h2 class="email-title">Appraisal action required</h2>
    <p class="email-text">Hi <strong>${rn}</strong>,</p>
    <p class="email-text">
      You have a pending <strong>${sl}</strong> for <strong>${en}</strong> in Miyo Global HR.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${actionUrl}" class="email-button">Open appraisal</a>
    </div>
  `;
  return getEmailTemplate({
    title: `Appraisal: ${stageLabel}`,
    preheader: `Action required — ${stageLabel} for ${employeeName}`,
    content,
  });
}

export function getAppraisalFinalApprovedEmail(
  recipientName: string,
  employeeName: string,
  cycleLabel: string,
  actionUrl: string
): string {
  const rn = escapeHtml(recipientName);
  const en = escapeHtml(employeeName);
  const cl = escapeHtml(cycleLabel);
  const content = `
    <h2 class="email-title">Appraisal finalized</h2>
    <p class="email-text">Hi <strong>${rn}</strong>,</p>
    <p class="email-text">
      The appraisal for <strong>${en}</strong> (${cl}) has been fully approved and is ready for acknowledgement / viewing.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${actionUrl}" class="email-button">View appraisal</a>
    </div>
  `;
  return getEmailTemplate({
    title: `Appraisal finalized — ${employeeName}`,
    preheader: `Appraisal approved for ${employeeName}`,
    content,
  });
}

export function getPIPInitiatedEmail(employeeName: string, pipUrl: string): string {
  const n = escapeHtml(employeeName);
  const content = `
    <h2 class="email-title">Performance Improvement Plan</h2>
    <p class="email-text">Hi <strong>${n}</strong>,</p>
    <p class="email-text">
      A PIP has been initiated outlining areas of improvement, goals, and timelines. Please review and acknowledge.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${pipUrl}" class="email-button">Review PIP</a>
    </div>
  `;
  return getEmailTemplate({
    title: "Performance Improvement Plan initiated",
    preheader: "Please review and acknowledge your PIP",
    content,
  });
}

export function getPIPManagerActivatedEmail(managerName: string, employeeName: string, pipUrl: string): string {
  const mn = escapeHtml(managerName);
  const en = escapeHtml(employeeName);
  const content = `
    <h2 class="email-title">PIP activated</h2>
    <p class="email-text">Hi <strong>${mn}</strong>,</p>
    <p class="email-text">
      PIP for <strong>${en}</strong> has been activated. Begin monitoring and schedule check-ins.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${pipUrl}" class="email-button">Open PIP</a>
    </div>
  `;
  return getEmailTemplate({
    title: `PIP activated — ${employeeName}`,
    preheader: `PIP for ${employeeName} is active`,
    content,
  });
}

export function getPIPSuccessEmail(employeeName: string): string {
  const n = escapeHtml(employeeName);
  const content = `
    <h2 class="email-title">PIP successfully completed</h2>
    <p class="email-text">Hi <strong>${n}</strong>,</p>
    <p class="email-text">Congratulations! You have successfully met the objectives of your PIP.</p>
  `;
  return getEmailTemplate({
    title: "PIP completed",
    preheader: "You have successfully completed your PIP",
    content,
  });
}

export function getPIPFailedEmail(employeeName: string): string {
  const n = escapeHtml(employeeName);
  const content = `
    <h2 class="email-title">PIP outcome — not successful</h2>
    <p class="email-text">Hi <strong>${n}</strong>,</p>
    <p class="email-text">
      The PIP has concluded without meeting required expectations. Further action will be communicated.
    </p>
  `;
  return getEmailTemplate({
    title: "PIP not successful",
    preheader: "PIP concluded without meeting expectations",
    content,
  });
}

export function getPIPExtendedEmail(employeeName: string): string {
  const n = escapeHtml(employeeName);
  const content = `
    <h2 class="email-title">PIP extended</h2>
    <p class="email-text">Hi <strong>${n}</strong>,</p>
    <p class="email-text">Your PIP duration has been extended to allow additional time for improvement.</p>
  `;
  return getEmailTemplate({
    title: "PIP extended",
    preheader: "Your PIP has been extended",
    content,
  });
}

export function getPIPCheckInDueReminderEmail(
  recipientName: string,
  dueDate: string,
  url: string
): string {
  const rn = escapeHtml(recipientName);
  const dd = escapeHtml(dueDate);
  const content = `
    <h2 class="email-title">Reminder: PIP check-in due soon</h2>
    <p class="email-text">Hi <strong>${rn}</strong>,</p>
    <p class="email-text">
      A PIP check-in is due by <strong>${dd}</strong> (1 day remaining). Please complete your part in the portal.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" class="email-button">Open PIP</a>
    </div>
  `;
  return getEmailTemplate({
    title: `PIP check-in due ${dueDate}`,
    preheader: "Performance Improvement Plan check-in reminder",
    content,
  });
}

export function getAppraisalDueReminderEmail(recipientName: string, stageLabel: string, dueDate: string, url: string): string {
  const rn = escapeHtml(recipientName);
  const sl = escapeHtml(stageLabel);
  const dd = escapeHtml(dueDate);
  const content = `
    <h2 class="email-title">Reminder: appraisal due soon</h2>
    <p class="email-text">Hi <strong>${rn}</strong>,</p>
    <p class="email-text">
      Your <strong>${sl}</strong> is due by <strong>${dd}</strong> (1 day remaining).
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" class="email-button">Complete now</a>
    </div>
  `;
  return getEmailTemplate({
    title: `Due tomorrow: ${stageLabel}`,
    preheader: `Appraisal stage due ${dueDate}`,
    content,
  });
}
