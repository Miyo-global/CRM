import { sendEmail, sendTemplateEmail } from "./sender";
import { baseUrl } from "./sender";
import { formatIST } from "@/lib/date-utils";
import {
  getInvitationEmailTemplate,
  type WelcomeEmailDetails,
  getAccountDeactivationEmailTemplate,
  getAccountLockedEmailTemplate,
  getNewDeviceLoginEmailTemplate,
  getPasswordExpiryWarningEmailTemplate,
} from "../email-templates";

/** MIYO-0218: the hand-written auth-verify-email template. */
export async function sendVerificationEmail(email: string, token: string) {
  await sendTemplateEmail("auth-verify-email", {
    to: email,
    vars: {
      email,
      verify_url: `${baseUrl}/verify-email?token=${token}`,
    },
  });
}

/** MIYO-0160: the hand-written auth-password-reset template. */
export async function sendPasswordResetEmail(email: string, token: string) {
  await sendTemplateEmail("auth-password-reset", {
    to: email,
    vars: {
      email,
      reset_url: `${baseUrl}/reset-password?token=${token}`,
      requested_at: `${formatIST(new Date())} IST`,
    },
  });
}

export async function sendInvitationEmail(
  email: string,
  token: string,
  organizationName: string,
  inviterName?: string
) {
  const invitationUrl = `${baseUrl}/invitation/${token}`;
  await sendEmail({
    to: email,
    subject: `Invitation to join ${organizationName}`,
    html: getInvitationEmailTemplate(invitationUrl, organizationName, inviterName),
  });
}

/** MIYO-0159: the hand-written auth-welcome-set-password template. */
export async function sendWelcomeEmail(
  email: string,
  name: string,
  setupUrl: string,
  details: WelcomeEmailDetails = {},
) {
  await sendTemplateEmail("auth-welcome-set-password", {
    to: email,
    vars: {
      first_name: name.trim().split(/\s+/)[0] || name,
      email,
      setup_url: setupUrl,
      joining_date: details.joiningDate ?? "your first day",
      manager_name: details.managerName ?? "your manager",
      link_expires_at: details.linkExpiresAt ?? "in 7 days",
    },
  });
}

/** MIYO-0219: the hand-written auth-password-changed template. */
export async function sendPasswordChangeConfirmationEmail(
  email: string,
  userName: string,
  changedAt: string = `${formatIST(new Date())} IST`,
) {
  await sendTemplateEmail("auth-password-changed", {
    to: email,
    vars: {
      first_name: userName.trim().split(/\s+/)[0] || userName,
      email,
      changed_at: changedAt,
    },
  });
}

export async function sendAccountDeactivationEmail(
  email: string,
  employeeName: string,
  deactivatedBy: string,
  reason?: string
) {
  await sendEmail({
    to: email,
    subject: "Account Deactivated",
    html: getAccountDeactivationEmailTemplate(employeeName, deactivatedBy, reason),
  });
}

export async function sendAccountLockedEmail(email: string, name: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Account Locked",
    html: getAccountLockedEmailTemplate(name),
  });
}

export async function sendNewDeviceLoginEmail(
  email: string,
  name: string,
  deviceInfo: { userAgent: string; ipAddress: string; time: string }
): Promise<void> {
  await sendEmail({
    to: email,
    subject: "New Device Sign-In Detected",
    html: getNewDeviceLoginEmailTemplate(name, deviceInfo),
  });
}

export async function sendPasswordExpiryWarningEmail(
  email: string,
  name: string,
  daysLeft: number
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `Your Password Expires in ${daysLeft} Days`,
    html: getPasswordExpiryWarningEmailTemplate(name, daysLeft),
  });
}
