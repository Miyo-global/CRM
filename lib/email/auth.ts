import { sendEmail, sendTemplateEmail } from "./sender";
import { baseUrl } from "./sender";
import { formatIST, formatDisplayDate } from "@/lib/date-utils";
import { getRoleLabel } from "@/lib/rbac/roles";
import {
  type WelcomeEmailDetails,
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

/** MIYO-0224: the hand-written auth-invitation template. */
export async function sendInvitationEmail(
  email: string,
  token: string,
  organizationName: string,
  details: { inviterName?: string; role?: string; expiresOn?: Date } = {},
) {
  const expiresOn = details.expiresOn ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await sendTemplateEmail("auth-invitation", {
    to: email,
    vars: {
      invite_target: organizationName,
      invite_url: `${baseUrl}/invitation/${token}`,
      inviter_name: details.inviterName ?? `The ${organizationName} team`,
      role: details.role ? getRoleLabel(details.role) : "a team member",
      expires_on: formatDisplayDate(expiresOn, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
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

/** MIYO-0223: the hand-written auth-account-deactivated template. */
export async function sendAccountDeactivationEmail(
  email: string,
  employeeName: string,
  deactivatedOn: string = formatIST(new Date()).split(",")[0],
) {
  await sendTemplateEmail("auth-account-deactivated", {
    to: email,
    vars: {
      first_name: employeeName.trim().split(/\s+/)[0] || employeeName,
      deactivated_on: deactivatedOn,
    },
  });
}

/** MIYO-0220: the hand-written auth-account-locked template. */
export async function sendAccountLockedEmail(
  email: string,
  attempts: number,
  lockedUntil: Date,
): Promise<void> {
  await sendTemplateEmail("auth-account-locked", {
    to: email,
    vars: {
      email,
      attempts,
      unlock_at: `${formatIST(lockedUntil)} IST`,
    },
  });
}

/** MIYO-0221: the hand-written auth-new-device-login template. */
export async function sendNewDeviceLoginEmail(
  email: string,
  deviceInfo: { userAgent: string; ipAddress: string; signedInAt?: Date; location?: string },
): Promise<void> {
  await sendTemplateEmail("auth-new-device-login", {
    to: email,
    vars: {
      device: deviceInfo.userAgent,
      ip_address: deviceInfo.ipAddress,
      // The app does not geolocate a sign-in, and guessing from the address
      // would put a wrong city in a security mail.
      location: deviceInfo.location ?? "not recorded",
      signed_in_at: `${formatIST(deviceInfo.signedInAt ?? new Date())} IST`,
    },
  });
}

/** MIYO-0222: the hand-written auth-password-expiry template. */
export async function sendPasswordExpiryWarningEmail(
  email: string,
  expiresOn: string,
): Promise<void> {
  await sendTemplateEmail("auth-password-expiry", {
    to: email,
    vars: { expires_on: expiresOn },
  });
}

/** MIYO-0225: told when two-step verification is switched on. */
export async function sendMfaEnabledEmail(email: string): Promise<void> {
  await sendTemplateEmail("auth-mfa-enabled", {
    to: email,
    vars: { email, changed_at: formatIST(new Date()) },
  });
}

/** MIYO-0226: told when two-step verification is switched off. */
export async function sendMfaDisabledEmail(email: string): Promise<void> {
  await sendTemplateEmail("auth-mfa-disabled", {
    to: email,
    vars: { email, changed_at: formatIST(new Date()) },
  });
}

/** MIYO-0227: told when an administrator resets the second factor. */
export async function sendMfaResetByAdminEmail(email: string): Promise<void> {
  await sendTemplateEmail("auth-mfa-reset-by-admin", {
    to: email,
    vars: { changed_at: formatIST(new Date()) },
  });
}
