import { sendTemplateEmail } from "./sender";
import { COMPANY_OFFICE_LOCATION, WORK_START_TIME } from "@/lib/constants/company";
import { appUrl } from "@/lib/app-url";

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

/** MIYO-0231: the hand-written onboarding-complete-employee template. */
export async function sendOnboardingCompleteEmployeeEmail(
  email: string,
  employeeName: string,
) {
  await sendTemplateEmail("onboarding-complete-employee", {
    to: email,
    vars: { first_name: employeeName.trim().split(/\s+/)[0] || employeeName },
  });
}

/** MIYO-0232: the hand-written onboarding-complete-hr template. */
export async function sendOnboardingCompleteHrEmail(
  email: string | string[],
  employee: {
    name: string;
    id: string;
    employeeCode?: string | null;
    department?: string | null;
  },
  taskCount: number,
  completedOn: string,
) {
  await sendTemplateEmail("onboarding-complete-hr", {
    to: email,
    vars: {
      employee_name: employee.name,
      employee_id: employee.id,
      employee_code: employee.employeeCode ?? "not set",
      department: employee.department ?? "not set",
      task_count: taskCount,
      completed_on: completedOn,
    },
  });
}
