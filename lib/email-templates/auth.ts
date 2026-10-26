import { getEmailTemplate, baseUrl, escapeHtml } from "./base";
import { SUPPORT_EMAIL } from "@/lib/constants/company";
import { BRAND } from "@/lib/design/brand-hex";

export function getVerificationEmailTemplate(verificationUrl: string): string {
  const content = `
    <h2 class="email-title">Verify Your Email Address</h2>
    <p class="email-text">
      Thank you for signing up! To complete your registration and access all features,
      please verify your email address by clicking the button below.
    </p>

    <div style="text-align: center;">
      <a href="${verificationUrl}" class="email-button">
        Verify Email Address
      </a>
    </div>

    <p class="email-text" style="font-size: 14px; color: ${BRAND.inkMuted}; margin-top: 24px;">
      If the button doesn't work, you can copy and paste this link into your browser:
    </p>
    <p class="email-text" style="word-break: break-all; font-size: 13px; color: ${BRAND.ink};">
      ${verificationUrl}
    </p>

    <div class="security-notice">
      <p class="security-text">
        <strong>Security Notice:</strong> This link will expire in 24 hours.
        If you didn't create an account, please ignore this email.
      </p>
    </div>
  `;

  return getEmailTemplate({
    title: 'Verify Your Email',
    preheader: 'Complete your registration by verifying your email address',
    content,
  });
}

export interface WelcomeEmailDetails {
  /** First name as entered; the greeting used only the first word of the full name (FR1-020). */
  firstName?: string | null;
  /** HR employee ID (e.g. VC26019), shown on the welcome mail (FR1-021). */
  employeeId?: string | null;
  /** Date the employee starts, as a display string. */
  joiningDate?: string | null;
  /** Reporting manager's name. */
  managerName?: string | null;
  designation?: string | null;
  /** When the set-up link stops working, as IST text. */
  linkExpiresAt?: string | null;
}

/**
 * Account set-up email.
 *
 * The old copy was generic ("excited to have you on board"), showed an empty
 * credential box, said "expires in 7 days" with no date, and left out the
 * joining date and manager the new hire actually needs (QA-0041).
 */
export function getPasswordChangeConfirmationEmailTemplate(
  userName: string,
  changedAt?: string | null,
): string {
  const sUserName = escapeHtml(userName);
  const content = `
    <h2 class="email-title">Your password was changed</h2>
    <p class="email-text">
      ${sUserName}, the password on your Miyo Global CRM account was changed${
        changedAt ? ` on ${escapeHtml(changedAt)}` : ""
      }.
    </p>

    <p class="email-text">
      <a href="${baseUrl}/settings" class="email-button">Review your security settings</a>
    </p>

    <div class="security-notice">
      <p class="security-text">
        If this was not you, reset your password now and write to
        <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND.warning}; text-decoration: underline;">${SUPPORT_EMAIL}</a>.
      </p>
    </div>
  `;

  return getEmailTemplate({
    title: "Your password was changed",
    preheader: "The password on your account was changed",
    content,
  });
}

export function getAccountDeactivationEmailTemplate(
  employeeName: string,
  deactivatedBy: string,
  reason?: string
): string {
  const sEmployee = escapeHtml(employeeName);
  const sDeactivatedBy = escapeHtml(deactivatedBy);
  const sReason = reason ? escapeHtml(reason) : undefined;
  const content = `
    <h2 class="email-title">Account Deactivated</h2>
    <p class="email-text">
      Dear <strong>${sEmployee}</strong>,
    </p>

    <p class="email-text">
      Your account on Miyo Global CRM has been deactivated by <strong>${sDeactivatedBy}</strong>.
    </p>

    ${sReason ? `
    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Reason:</span>
        <span style="color: ${BRAND.inkMuted}; margin-left: 8px;">${sReason}</span>
      </div>
    </div>
    ` : ''}

    <p class="email-text">
      You will no longer have access to:
    </p>
    <ul style="color: ${BRAND.inkMuted}; font-size: 15px; line-height: 1.8; margin: 16px 0;">
      <li>The CRM dashboard and all projects</li>
      <li>Time tracking and attendance systems</li>
      <li>HR portal and leave management</li>
      <li>Company documents and files</li>
    </ul>

    <div class="divider"></div>

    <p class="email-text">
      If you believe this is an error or have questions, please contact HR at
      <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND.ink}; text-decoration: underline;">${SUPPORT_EMAIL}</a>.
    </p>

    <p class="email-text" style="margin-top: 24px;">
      Thank you for your contributions to the organization.
    </p>
  `;

  return getEmailTemplate({
    title: 'Account Deactivated',
    preheader: 'Your account has been deactivated',
    content,
  });
}

export function getAccountLockedEmailTemplate(name: string): string {
  const sName = escapeHtml(name);
  const content = `
    <h2 class="email-title">Account Temporarily Locked</h2>
    <p class="email-text">
      Hi <strong>${sName}</strong>,
    </p>

    <p class="email-text">
      Your account has been temporarily locked due to multiple failed login attempts. This is a security measure to protect your account.
    </p>

    <div class="security-notice">
      <p class="security-text">
        <strong>Your account will be unlocked in 15 minutes.</strong>
        If you did not attempt to log in, your credentials may have been compromised.
        Please reset your password immediately.
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${baseUrl}/forgot-password" class="email-button">
        Reset Password
      </a>
    </div>

    <p class="email-text" style="font-size: 14px; color: ${BRAND.inkMuted};">
      If you need immediate assistance, please contact our support team at
      <a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND.ink};">${SUPPORT_EMAIL}</a>.
    </p>
  `;

  return getEmailTemplate({
    title: 'Account Locked',
    preheader: 'Your account has been temporarily locked',
    content,
  });
}

export function getNewDeviceLoginEmailTemplate(
  name: string,
  deviceInfo: { userAgent: string; ipAddress: string; time: string }
): string {
  const sName = escapeHtml(name);
  const sUserAgent = escapeHtml(deviceInfo.userAgent || "Unknown device");
  const sIp = escapeHtml(deviceInfo.ipAddress || "Unknown IP");
  const sTime = escapeHtml(deviceInfo.time);
  const content = `
    <h2 class="email-title">New Device Sign-In Detected</h2>
    <p class="email-text">
      Hi <strong>${sName}</strong>,
    </p>

    <p class="email-text">
      We detected a sign-in to your Miyo Global account from a new device or location.
    </p>

    <div class="credential-box">
      <div class="credential-item">
        <span class="credential-label">Device:</span>
        <span style="color: ${BRAND.inkMuted}; margin-left: 8px; font-size: 13px;">${sUserAgent}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">IP Address:</span>
        <span style="color: ${BRAND.inkMuted}; margin-left: 8px; font-size: 13px;">${sIp}</span>
      </div>
      <div class="credential-item">
        <span class="credential-label">Time:</span>
        <span style="color: ${BRAND.inkMuted}; margin-left: 8px; font-size: 13px;">${sTime}</span>
      </div>
    </div>

    <div class="security-notice">
      <p class="security-text">
        <strong>Was this you?</strong> If you signed in, you can ignore this email.
        If you did NOT sign in, your account may be compromised. Reset your password immediately.
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${baseUrl}/forgot-password" class="email-button">
        Secure My Account
      </a>
    </div>
  `;

  return getEmailTemplate({
    title: 'New Device Sign-In',
    preheader: 'A new device signed into your account',
    content,
  });
}

export function getPasswordExpiryWarningEmailTemplate(name: string, daysLeft: number): string {
  const sName = escapeHtml(name);
  const content = `
    <h2 class="email-title">Your Password is Expiring Soon</h2>
    <p class="email-text">
      Hi <strong>${sName}</strong>,
    </p>

    <p class="email-text">
      Your Miyo Global account password will expire in <strong>${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong>.
      Please update it before it expires to avoid being locked out of your account.
    </p>

    <div class="security-notice">
      <p class="security-text">
        <strong>Action Required:</strong> Update your password within the next ${daysLeft} day${daysLeft !== 1 ? "s" : ""}.
        After expiry you will be required to reset your password before you can log in.
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${baseUrl}/settings?tab=security" class="email-button">
        Update Password
      </a>
    </div>

    <p class="email-text" style="font-size: 14px; color: ${BRAND.inkMuted};">
      Choose a strong password with at least 8 characters, including uppercase, lowercase, numbers, and special characters.
    </p>
  `;

  return getEmailTemplate({
    title: 'Password Expiring Soon',
    preheader: `Your password expires in ${daysLeft} days`,
    content,
  });
}
