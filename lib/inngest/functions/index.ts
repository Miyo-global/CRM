import { celebrationGreetings } from "./celebration-greetings";
import { notificationHandler } from "./notification-handler";
import { webhookDispatcher } from "./webhook-dispatcher";
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
import { deactivateExitedEmployees } from "./deactivate-exited-employees";

// Scheduled jobs that also have a Vercel cron route (daily notifications,
// auto-checkout, holiday notifications, weekly attendance, weekly CEO recap,
// monthly expense report, monthly leave reset) run from vercel.json only, behind
// cronIdempotencyCheck. Registering them here as well ran them twice
// (MIYO-0090 / MIYO-0091).
export const inngestFunctions = [
  notificationHandler,
  webhookDispatcher,
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
  deactivateExitedEmployees,
];
