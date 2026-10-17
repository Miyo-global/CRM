# Miyo Global CRM — email templates

One `.html` (table layout, inline styles, gold/ink, logo, one CTA, footer, hidden preheader) and one hand-written `.txt` per template.

## How to use

- Placeholders are `{{snake_case}}`. HTML-escape every value before substituting it into the `.html`; never escape values used in the subject line.
- Always send the `.txt` file as the plain-text part (do not auto-convert HTML).
- Shared values: `{{org_name}}`, `{{org_address}}`, `{{logo_url}}` (= `${APP_URL}/logo.png`), `{{app_url}}`, `{{support_email}}`, `{{hr_email}}`.
- Times are always IST and labelled as such.
- No emoji in subjects or headings. One primary button per email.
- Port into `lib/email-templates/*` with a single `renderEmail(id, vars)` helper (see MIYO-CRM-TODO.md, Email section).

| Template | Subject | Trigger | Recipient | Replaces |
|---|---|---|---|---|
| `auth-welcome-set-password` | Set up your {{org_name}} account | POST /api/hr/employees/onboard | the new employee | getWelcomeEmailTemplate (lib/email-templates/auth.ts) via sendWelcomeEmail |
| `auth-verify-email` | Confirm your email address | POST /api/auth/signup, /api/auth/resend-verification | the user | getVerificationEmailTemplate |
| `auth-password-reset` | Reset your password | POST /api/auth/forgot-password | the user | getPasswordResetEmailTemplate |
| `auth-password-changed` | Your password was changed | password reset / change | the user | getPasswordChangeConfirmationEmailTemplate |
| `auth-account-locked` | Your account is temporarily locked | 5th failed sign-in | the user | getAccountLockedEmailTemplate |
| `auth-new-device-login` | New sign-in to your account | sign-in from an unknown device | the user | getNewDeviceLoginEmailTemplate |
| `auth-password-expiry` | Your password expires on {{expires_on}} | daily job when organizations.passwordExpiryDays is set (to be wired) | the user | getPasswordExpiryWarningEmailTemplate (no production caller) |
| `auth-account-deactivated` | Your {{org_name}} account has been deactivated | HR deactivates a user / last working day | the user (personal email if available) | getAccountDeactivationEmailTemplate |
| `auth-invitation` | {{inviter_name}} invited you to {{org_name}} | settings/members invite, project invite (invitations table) | the invitee | getInvitationEmailTemplate (lib/email-templates/organization.ts) |
| `auth-mfa-enabled` | Two-step verification is on | MFA turned on | the user | NEW (no email today; app/api/auth/mfa/verify) |
| `auth-mfa-disabled` | Two-step verification was turned off | MFA turned off by the user | the user | NEW (app/api/auth/mfa/disable) |
| `auth-mfa-reset-by-admin` | Your two-step verification was reset | Admin resets a user's MFA | the user | NEW (app/api/auth/mfa/reset) |
| `onboarding-welcome` | Your first day at {{org_name}}: {{joining_date}} | onboarding checklist started | the new hire | getOnboardingWelcomeEmailTemplate (notifications.ts) via Inngest initiate-onboarding |
| `onboarding-tasks-assigned` | Onboarding task for {{employee_name}}: {{task_title}} | onboarding task assigned to HR/IT/manager | task owner | getOnboardingTaskEmailTemplate |
| `onboarding-reminder` | {{pending_count}} onboarding tasks still open | POST /api/hr/onboarding/reminders | task owners | inline HTML in app/api/hr/onboarding/reminders/route.ts |
| `onboarding-complete-employee` | Onboarding complete | last onboarding task completed | the new hire | getOnboardingCompleteEmployeeEmailTemplate |
| `onboarding-complete-hr` | {{employee_name}} finished onboarding | last onboarding task completed | HR | getOnboardingCompleteHrEmailTemplate |
| `leave-request-approver` | Leave request: {{employee_name}}, {{date_range}} | leave applied | resolved approver + HR_LEAVE_NOTIFY_EMAIL | getLeaveRequestEmailTemplate (hr.ts) via sendLeaveRequestEmail |
| `leave-approved` | Leave approved: {{date_range}} | leave approved | the employee | getLeaveStatusUpdateEmailTemplate (approved branch) |
| `leave-rejected` | Leave not approved: {{date_range}} | leave rejected | the employee | getLeaveStatusUpdateEmailTemplate (rejected branch) |
| `leave-cancelled` | Leave cancelled: {{employee_name}}, {{date_range}} | employee cancels leave | the approver | getLeaveCancellationEmailTemplate |
| `leave-escalation-hr` | {{count}} leave requests waiting more than 2 days | Inngest leave-escalation (pending > 2 days) | HR | getLeaveHrMissedEscalationEmailTemplate |
| `leave-escalation-ceo` | {{count}} leave requests still pending | Inngest leave-escalation (still pending) | CEO | getLeaveCeoDelegateEscalationEmailTemplate |
| `wfh-request` | Work from home request: {{employee_name}}, {{date_range}} | WFH applied | approvers | getWfhRequestEmailTemplate |
| `attendance-auto-absent` | No check-in recorded for {{date}} | cron auto-absent-leave 12:00 IST | each absentee | inline HTML in server/actions/auto-absent-leave.ts |
| `attendance-late-arrival` | Late check-in on {{date}} | late check-in warning | the employee | inline HTML in lib/hr/late-arrival-after-check-in.ts |
| `attendance-weekly-report` | Attendance, week of {{week_range}} | weekly-attendance-report (Vercel Sat 14:30 IST AND Inngest Mon 13:30 IST — duplicate) | management | getWeeklyAttendanceReportTemplate (reports.ts) |
| `attendance-holiday-work-request` | Holiday work request: {{employee_name}}, {{date}} | holiday/Sunday work request submitted | HR | getHolidayWorkRequestEmailToHr (hr.ts) / inline in app/api/hr/holiday-work-requests/route.ts |
| `attendance-holiday-work-decision` | Holiday work request {{decision}}: {{date}} | holiday work request decided | the employee | inline HTML in app/api/hr/holiday-work-requests (decision) |
| `payroll-payslip` | Your payslip for {{month_label}} | payroll marked PAID | the employee | getPayslipEmailTemplate (hr.ts) + lib/hr/send-payslip-email.ts |
| `payroll-approved` | Payroll for {{month_label}} approved | CEO approves payroll | the employee | getPayrollApprovedEmailTemplate (notifications.ts) |
| `celebration-birthday` | Happy birthday, {{first_name}} | Inngest celebration-greetings 08:00 IST | the person | getCelebrationEmailTemplate (birthday branch) |
| `celebration-work-anniversary` | {{years}} years at {{org_name}} | Inngest celebration-greetings 08:00 IST | the person | getCelebrationEmailTemplate (anniversary branch) |
| `holiday-reminder` | Holiday tomorrow: {{holiday_name}} | holiday-notifications (day before) | all active members | getHolidayAnnouncementEmailTemplate (organization.ts) via sendBulkHolidayAnnouncement |
| `company-announcement` | {{announcement_title}} | announcement posted with email on | members | getCompanyAnnouncementEmailTemplate |
| `recognition-recipient` | {{giver_name}} recognised your work | recognition given | the recipient | getRecognitionRecipientEmailTemplate |
| `recognition-shoutout` | Shout-out for {{recipient_name}} | recognition shared org-wide | the org | getRecognitionShoutoutEmailTemplate |
| `expense-submitted` | Expense claim: {{employee_name}}, ₹{{amount}} | expense submitted | approver | getExpenseSubmittedEmailTemplate |
| `expense-approved` | Expense approved: ₹{{amount}} | expense approved | the employee | getExpenseApprovedEmailTemplate |
| `expense-rejected` | Expense not approved: ₹{{amount}} | expense rejected | the employee | getExpenseRejectedEmailTemplate |
| `expense-paid` | Expense reimbursed: ₹{{amount}} | expense marked paid | the employee | getExpensePaidEmailTemplate |
| `expense-monthly-report` | Expenses for {{month_label}}: ₹{{total}} | monthly-expense-report (Vercel 14:30 IST and Inngest 13:30 IST on the 1st — duplicate) | management | getMonthlyExpenseReportTemplate |
| `bonus-paid-employee` | Your bonus of ₹{{amount}} has been paid | bonus marked PAID | the employee | getBonusPaidEmployeeEmailTemplate (bonus.ts) |
| `bonus-paid-stakeholder` | Bonus paid: {{employee_name}}, ₹{{amount}} | bonus marked PAID | stakeholders | getBonusPaidStakeholderEmailTemplate |
| `exit-resignation-submitted` | Resignation: {{employee_name}} | resignation submitted | HR, CEO, Admin (except submitter) + manager | getResignationSubmittedEmailTemplate |
| `exit-resignation-accepted` | Your resignation has been accepted | CEO approves resignation | the employee | getResignationApprovedEmailTemplate |
| `exit-termination-notice` | Notice of termination of employment | termination letter sent | the employee (personal email) | getTerminationEmailTemplate |
| `perf-review-assigned` | Review to complete: {{employee_name}} | performance module | see trigger | getReviewAssignedEmailTemplate (lib/email-templates/appraisal.ts / notifications.ts) |
| `perf-self-review-reminder` | Self-review due {{due_date}} | performance module | see trigger | getSelfReviewReminderEmail (lib/email-templates/appraisal.ts / notifications.ts) |
| `perf-manager-review-reminder` | {{pending_count}} reviews waiting for you | performance module | see trigger | getManagerReviewReminderEmail (lib/email-templates/appraisal.ts / notifications.ts) |
| `perf-review-published` | Your {{cycle_name}} review is ready | performance module | see trigger | getReviewPublishedEmail (lib/email-templates/appraisal.ts / notifications.ts) |
| `perf-goal-setting-reminder` | Set your goals for {{quarter}} | performance module | see trigger | getGoalSettingReminderEmail (lib/email-templates/appraisal.ts / notifications.ts) |
| `perf-appraisal-stage-assigned` | Appraisal step for you: {{stage_label}} | performance module | see trigger | getAppraisalStageAssignedEmail (lib/email-templates/appraisal.ts / notifications.ts) |
| `perf-appraisal-finalized` | Appraisal finalised: {{employee_name}} | performance module | see trigger | getAppraisalFinalApprovedEmail (lib/email-templates/appraisal.ts / notifications.ts) |
| `perf-appraisal-due-reminder` | Due tomorrow: {{stage_label}} | performance module | see trigger | getAppraisalDueReminderEmail (lib/email-templates/appraisal.ts / notifications.ts) |
| `perf-unsatisfactory-notice` | Performance discussion: next steps | performance module | see trigger | getUnsatisfactoryPerformanceNoticeEmail (lib/email-templates/appraisal.ts / notifications.ts) |
| `perf-pip-initiated` | Performance improvement plan | performance module | see trigger | getPIPInitiatedEmail (lib/email-templates/appraisal.ts / notifications.ts) |
| `perf-pip-manager-activated` | PIP active: {{employee_name}} | performance module | see trigger | getPIPManagerActivatedEmail (lib/email-templates/appraisal.ts / notifications.ts) |
| `perf-pip-checkin-reminder` | PIP check-in on {{due_date}} | performance module | see trigger | getPIPCheckInDueReminderEmail (lib/email-templates/appraisal.ts / notifications.ts) |
| `perf-pip-completed` | Your improvement plan is complete | performance module | see trigger | getPIPSuccessEmail (lib/email-templates/appraisal.ts / notifications.ts) |
| `perf-pip-not-successful` | Outcome of your improvement plan | performance module | see trigger | getPIPFailedEmail (lib/email-templates/appraisal.ts / notifications.ts) |
| `perf-pip-extended` | Your improvement plan has been extended | performance module | see trigger | getPIPExtendedEmail (lib/email-templates/appraisal.ts / notifications.ts) |
| `asset-assigned-employee` | Asset assigned to you: {{asset_name}} | asset assigned | the employee | getAssetAssignedEmailTemplate (no production caller per design doc §11.2) |
| `asset-assigned-hr` | Asset assigned: {{asset_tag}} to {{employee_name}} | asset assigned | HR | getAssetAssignedHrNotificationTemplate |
| `document-expiry-reminder` | {{document_name}} expires on {{expiry_date}} | daily job (to be wired) | the employee + HR | getDocumentExpiryReminderEmailTemplate (no production caller) |
| `worklog-approved` | Work log approved: {{log_date}} | work log approved | the employee | getWorkLogApprovedEmailTemplate |
| `worklog-rejected` | Work log needs changes: {{log_date}} | work log rejected | the employee | getWorkLogRejectedEmailTemplate |
| `project-added` | You were added to {{project_name}} | added to a project | the member | getProjectAssignmentEmailTemplate (project.ts) |
| `ticket-assigned` | [{{ticket_key}}] {{ticket_title}} | ticket assigned | assignee | getTicketAssignmentEmailTemplate |
| `ticket-review-request` | [{{ticket_key}}] Review requested: {{ticket_title}} | ticket sent for review | reviewer | getTicketReviewRequestEmailTemplate |
| `ticket-changes-requested` | [{{ticket_key}}] Changes requested | reviewer requests changes | assignee | getTicketChangesRequestedEmailTemplate |
| `ticket-comment` | [{{ticket_key}}] New comment from {{author_name}} | comment on a watched/assigned ticket | assignee and watchers | getTicketCommentEmailTemplate |
| `ticket-mention` | [{{ticket_key}}] {{author_name}} mentioned you | @mention in a ticket comment | mentioned user | NEW (features/projects/comments mentions) |
| `task-assigned` | Task assigned: {{task_title}} | task assigned | assignee | getTaskAssignedEmailTemplate (notifications.ts) / lib/email/crm.ts |
| `support-ticket-created` | Support ticket #{{ticket_id}}: {{ticket_subject}} | support ticket created/assigned | assigned agent | getTicketCreatedEmailTemplate (notifications.ts) |
| `support-ticket-reply` | Re: #{{ticket_id}} {{ticket_subject}} | reply on support ticket | requester or agent | getTicketReplyEmailTemplate |
| `support-ticket-status` | Ticket #{{ticket_id}} is now {{status}} | support ticket status change | requester | getTicketStatusEmailTemplate |
| `helpdesk-ticket` | HR helpdesk #{{ticket_id}}: {{ticket_subject}} | HR helpdesk ticket events | HR / requester | getHelpdeskTicketEmailTemplate |
| `weekly-ceo-recap` | Weekly recap: {{week_range}} | weekly-ceo-recap (Vercel Mon 15:30 IST and Inngest Mon 14:30 IST — duplicate) | CEO | getWeeklyCeoRecapTemplate + server/actions/weekly-ceo-recap.ts |
| `one-on-one-invite` | 1:1 with {{organizer_name}}: {{meeting_date}} | 1:1 scheduled | attendees | inline HTML in lib/hr/one-on-one-invite.ts |
| `calendar-event` | {{event_action}}: {{event_title}}, {{event_date}} | event created/changed/15-min reminder | attendees | inline HTML in lib/calendar-event-notifications.ts |
| `data-export-ready` | Your {{export_name}} export is ready | export requested by email | the requester | inline HTML in app/api/hr/*/export/email routes and server/actions/expense-export.ts |
| `ats-application-received` | We received your application for {{job_title}} | public apply form submitted | candidate | getApplicationConfirmationEmail (lib/email-templates/hr-recruitment.ts, leftover) |
| `ats-application-rejected` | Your application for {{job_title}} | candidate moved to Rejected with 'send email' ticked | candidate | getCandidateRejectionEmail (duplicated in hr.ts AND hr-recruitment.ts) |
| `ats-interview-invite` | Interview for {{job_title}}: {{interview_date}} | interview scheduled | candidate | getCandidateInterviewInviteEmail / getInterviewInviteEmail (duplicated) |
| `ats-interview-reminder` | Reminder: interview tomorrow at {{interview_time}} IST | 24 h before interview | candidate | NEW |
| `ats-interviewer-feedback-request` | Feedback needed: {{candidate_name}} for {{job_title}} | interview ended without scorecard | interviewer | NEW (internal) |
| `ats-offer` | Your offer from {{org_name}}: {{job_title}} | offer sent | candidate | getCandidateOfferEmail (hr-recruitment.ts, leftover) |
| `ats-offer-response-hr` | Offer {{decision}}: {{candidate_name}}, {{job_title}} | candidate accepts or declines | recruiter + hiring manager | buildOfferResponseHrNotificationHtml (hr-recruitment.ts, leftover) |
| `ats-new-application-internal` | New application: {{candidate_name}} for {{job_title}} | new application on a job | recruiter + hiring manager (digest option) | getRecruitmentHrEmail (leftover) |
| `ats-requisition-approval` | Approve hiring: {{job_title}} ({{openings}}) | job requisition submitted | approver (CEO/HR) | NEW |
