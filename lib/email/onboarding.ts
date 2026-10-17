import { sendEmail, sendTemplateEmail } from "./sender";
import { COMPANY_OFFICE_LOCATION, WORK_START_TIME } from "@/lib/constants/company";
import { appUrl } from "@/lib/app-url";
import {
  getOnboardingCompleteEmployeeEmailTemplate,
  getOnboardingCompleteHrEmailTemplate,
} from "../email-templates";

/** MIYO-0228: the hand-written onboarding-welcome template. */
export async function sendOnboardingWelcomeEmail(
  email: string,
  employeeName: string,
  joiningDate: string,
  taskCount: number,
  managerName?: string | null,
) {
  await sendTemplateEmail("onboarding-welcome", {
    to: email,
    vars: {
      first_name: employeeName.trim().split(/\s+/)[0] || employeeName,
      joining_date: joiningDate,
      task_count: taskCount,
      manager_name: managerName?.trim() || "your manager",
      office_location: COMPANY_OFFICE_LOCATION || "to be confirmed by your manager",
      start_time: WORK_START_TIME || "to be confirmed by your manager",
    },
  });
}

/** MIYO-0229: the hand-written onboarding-tasks-assigned template. */
export async function sendOnboardingTaskEmail(
  email: string,
  employeeName: string,
  taskTitle: string,
  details: { joiningDate?: string; dueDate?: string; taskUrl?: string } = {},
) {
  await sendTemplateEmail("onboarding-tasks-assigned", {
    to: email,
    vars: {
      employee_name: employeeName,
      task_title: taskTitle,
      joining_date: details.joiningDate ?? "not set",
      due_date: details.dueDate ?? "as soon as possible",
      task_url: details.taskUrl ?? `${appUrl}/hr/onboarding`,
    },
  });
}

export async function sendOnboardingCompleteEmployeeEmail(
  email: string,
  employeeName: string
) {
  await sendEmail({
    to: email,
    subject: "Onboarding Complete — Welcome to the Team!",
    html: getOnboardingCompleteEmployeeEmailTemplate(employeeName),
  });
}

export async function sendOnboardingCompleteHrEmail(
  email: string,
  hrName: string,
  employeeName: string
) {
  await sendEmail({
    to: email,
    subject: `Onboarding Complete: ${employeeName}`,
    html: getOnboardingCompleteHrEmailTemplate(hrName, employeeName),
  });
}
