import { dailyNotifications } from "./daily-notifications";
import { autoCheckout } from "./auto-checkout";
import { slaCheck } from "./sla-check";
import { notificationHandler } from "./notification-handler";
import { webhookDispatcher } from "./webhook-dispatcher";
import { weeklyAttendanceReport } from "./weekly-attendance-report";
import { weeklyCeoRecap } from "./weekly-ceo-recap";
import { monthlyExpenseReport } from "./monthly-expense-report";
import { monthlyLeaveReset } from "./monthly-leave-reset";
import { holidayNotifications } from "./holiday-notifications";
import { paymentReminders } from "./payment-reminders";
import { dailySalesDigest } from "./daily-sales-digest";
import {
  onResignationSubmitted,
  onResignationHrApproved,
  onResignationCeoApproved,
  onTerminationSubmitted,
  onTerminationCeoApproved,
} from "./hr-exit-notifications";
import { overdueTaskAlerts } from "./overdue-task-alerts";
import { interviewSlaCheck } from "./interview-sla-check";
import { initiateOnboarding } from "./initiate-onboarding";
import { interviewReminders } from "./interview-reminders";
import { interviewNoShow } from "./interview-no-show";
import { dailyJobBoardSync } from "./daily-job-board-sync";
import { leadTemperatureUpdate } from "./lead-temperature-update";
import { weeklyProjectReport } from "./weekly-project-report";
import { eventReminders } from "./event-reminders";
import { offerDeadlineReminder } from "./offer-deadline-reminder";
import { leaveEscalation } from "./leave-escalation";
import { candidateFeedbackEmail } from "./candidate-feedback-email";
import { autoPayrollGeneration } from "./auto-payroll-generation";

export const inngestFunctions = [
  dailyNotifications,
  autoCheckout,
  slaCheck,
  notificationHandler,
  webhookDispatcher,
  weeklyAttendanceReport,
  weeklyCeoRecap,
  monthlyExpenseReport,
  monthlyLeaveReset,
  holidayNotifications,
  paymentReminders,
  dailySalesDigest,
  onResignationSubmitted,
  onResignationHrApproved,
  onResignationCeoApproved,
  onTerminationSubmitted,
  onTerminationCeoApproved,
  overdueTaskAlerts,
  interviewSlaCheck,
  initiateOnboarding,
  interviewReminders,
  interviewNoShow,
  dailyJobBoardSync,
  leadTemperatureUpdate,
  weeklyProjectReport,
  eventReminders,
  offerDeadlineReminder,
  leaveEscalation,
  candidateFeedbackEmail,
  autoPayrollGeneration,
];
