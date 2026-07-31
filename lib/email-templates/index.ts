export { getEmailTemplate, baseUrl, logoUrl } from "./base";
export type { EmailTemplateProps } from "./base";

export {
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getWelcomeEmailTemplate,
  getPasswordChangeConfirmationEmailTemplate,
  getAccountDeactivationEmailTemplate,
  getAccountLockedEmailTemplate,
  getNewDeviceLoginEmailTemplate,
  getPasswordExpiryWarningEmailTemplate,
} from "./auth";

export {
  getInvitationEmailTemplate,
  getHolidayAnnouncementEmailTemplate,
  getCompanyAnnouncementEmailTemplate,
} from "./organization";

export {
  getProjectAssignmentEmailTemplate,
  getTicketAssignmentEmailTemplate,
  getTicketReviewRequestEmailTemplate,
  getTicketChangesRequestedEmailTemplate,
  getTicketCommentEmailTemplate,
} from "./project";

export {
  getLeaveRequestEmailTemplate,
  getWfhRequestEmailTemplate,
  getLeaveStatusUpdateEmailTemplate,
  getLeaveCancellationEmailTemplate,
  getLeaveHrMissedEscalationEmailTemplate,
  getLeaveCeoDelegateEscalationEmailTemplate,
  type LeaveEscalationRow,
  getDocumentExpiryReminderEmailTemplate,
  getResignationSubmittedEmailTemplate,
  getResignationApprovedEmailTemplate,
  getTerminationEmailTemplate,
  getCandidateRejectionEmail,
  getPayslipEmailTemplate,
  getHolidayWorkRequestEmailToHr,
} from "./hr";

export {
  getExpenseSubmittedEmailTemplate,
  getExpenseApprovedEmailTemplate,
  getExpenseRejectedEmailTemplate,
  getExpensePaidEmailTemplate,
} from "./expense";

export {
  getBonusPaidEmployeeEmailTemplate,
  getBonusPaidStakeholderEmailTemplate,
} from "./bonus";

export {
  getWeeklyAttendanceReportTemplate,
  getMonthlyExpenseReportTemplate,
} from "./reports";
export type { MonthlyExpenseReportRow } from "./reports";

export {
  getSelfReviewReminderEmail,
  getManagerReviewReminderEmail,
  getReviewPublishedEmail,
  getGoalSettingReminderEmail,
  getUnsatisfactoryPerformanceNoticeEmail,
  getAppraisalStageAssignedEmail,
  getAppraisalFinalApprovedEmail,
  getAppraisalDueReminderEmail,
  getPIPCheckInDueReminderEmail,
  getPIPInitiatedEmail,
  getPIPManagerActivatedEmail,
  getPIPSuccessEmail,
  getPIPFailedEmail,
  getPIPExtendedEmail,
} from "./appraisal";

export {
  getLeadWelcomeEmail,
  getFollowUpReminderEmail,
  getDealWonEmail,
  getSlaBreachAlertEmail,
  getClientOnboardingEmail,
} from "./crm";

export {
  getWorkLogApprovedEmailTemplate,
  getWorkLogRejectedEmailTemplate,
  getOnboardingWelcomeEmailTemplate,
  getOnboardingTaskEmailTemplate,
  getTicketCreatedEmailTemplate,
  getTicketReplyEmailTemplate,
  getTicketStatusEmailTemplate,
  getTaskAssignedEmailTemplate,
  getDealStageChangeEmailTemplate,
  getLeadAssignedEmailTemplate,
  getReviewAssignedEmailTemplate,
  getOnboardingCompleteEmployeeEmailTemplate,
  getOnboardingCompleteHrEmailTemplate,
  getHelpdeskTicketEmailTemplate,
  getAssetAssignedEmailTemplate,
  getAssetAssignedHrNotificationTemplate,
  getPayrollApprovedEmailTemplate,
  getRecognitionRecipientEmailTemplate,
  getRecognitionShoutoutEmailTemplate,
} from "./notifications";

export {
  getRecruitmentHrEmail,
  type RecruitmentEmailEvent,
  type JobRecruitmentEmailParams,
} from "./hr-recruitment";
