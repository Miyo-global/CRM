import { sendEmail } from "./sender";
import {
  getOnboardingWelcomeEmailTemplate,
  getOnboardingTaskEmailTemplate,
  getOnboardingCompleteEmployeeEmailTemplate,
  getOnboardingCompleteHrEmailTemplate,
} from "../email-templates";

export async function sendOnboardingWelcomeEmail(
  email: string,
  employeeName: string,
  designation: string,
  joiningDate: string,
  taskCount: number
) {
  await sendEmail({
    to: email,
    subject: "Welcome to Miyo Global — Your Onboarding Starts Now!",
    html: getOnboardingWelcomeEmailTemplate(employeeName, designation, joiningDate, taskCount),
  });
}

export async function sendOnboardingTaskEmail(
  email: string,
  recipientName: string,
  employeeName: string,
  taskRole: string,
  taskCount: number
) {
  await sendEmail({
    to: email,
    subject: `Onboarding Tasks Assigned: ${employeeName}`,
    html: getOnboardingTaskEmailTemplate(recipientName, employeeName, taskRole, taskCount),
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
