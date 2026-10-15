import { dailyNotifications } from "./daily-notifications";
import { celebrationGreetings } from "./celebration-greetings";
import { autoCheckout } from "./auto-checkout";
import { notificationHandler } from "./notification-handler";
import { webhookDispatcher } from "./webhook-dispatcher";
import { weeklyAttendanceReport } from "./weekly-attendance-report";
import { weeklyCeoRecap } from "./weekly-ceo-recap";
import { monthlyExpenseReport } from "./monthly-expense-report";
import { monthlyLeaveReset } from "./monthly-leave-reset";
import { holidayNotifications } from "./holiday-notifications";
import {
  onResignationSubmitted,
  onResignationHrApproved,
  onResignationCeoApproved,
  onTerminationSubmitted,
  onTerminationCeoApproved,
} from "./hr-exit-notifications";
import { overdueTaskAlerts } from "./overdue-task-alerts";
import { initiateOnboarding } from "./initiate-onboarding";
import { weeklyProjectReport } from "./weekly-project-report";
import { eventReminders } from "./event-reminders";
import { leaveEscalation } from "./leave-escalation";
import { autoPayrollGeneration } from "./auto-payroll-generation";

export const inngestFunctions = [
  dailyNotifications,
  autoCheckout,
  notificationHandler,
  webhookDispatcher,
  weeklyAttendanceReport,
  weeklyCeoRecap,
  monthlyExpenseReport,
  monthlyLeaveReset,
  holidayNotifications,
  onResignationSubmitted,
  onResignationHrApproved,
  onResignationCeoApproved,
  onTerminationSubmitted,
  onTerminationCeoApproved,
  overdueTaskAlerts,
  initiateOnboarding,
  weeklyProjectReport,
  eventReminders,
  leaveEscalation,
  autoPayrollGeneration,
  celebrationGreetings,
];
