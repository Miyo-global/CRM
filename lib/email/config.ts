/**
 * Single source of truth for outbound-mail configuration (ZeptoMail / Zoho only).
 */

export type EmailProvider = "zeptomail";

/** Reads an env var, treating whitespace-only as unset. */
function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/** ZeptoMail default (US/global). India accounts usually use api.zeptomail.in. */
const DEFAULT_ZEPTOMAIL_API_URL = "https://api.zeptomail.com/v1.1/email";

const AUTH_SCHEME = "Zoho-enczapikey";

/**
 * ZeptoMail Send Mail Token.
 *
 * Prefers Miyo platform naming (`ZEPTOMAIL_API_TOKEN`), then CRM aliases
 * (`ZEPTOMAIL_TOKEN`, `ZEPTOMAIL_API_KEY`). Strips a pasted `Zoho-enczapikey ` prefix.
 */
export function getZeptoMailToken(): string | undefined {
  const raw =
    env("ZEPTOMAIL_API_TOKEN") ?? env("ZEPTOMAIL_TOKEN") ?? env("ZEPTOMAIL_API_KEY");
  if (!raw) return undefined;
  const withoutScheme = raw.replace(new RegExp(`^${AUTH_SCHEME}\\s+`, "i"), "").trim();
  return withoutScheme || undefined;
}

export function getZeptoMailAuthHeader(): string | undefined {
  const token = getZeptoMailToken();
  return token ? `${AUTH_SCHEME} ${token}` : undefined;
}

export function getZeptoMailApiUrl(): string {
  return env("ZEPTOMAIL_API_URL") ?? DEFAULT_ZEPTOMAIL_API_URL;
}

export function getZeptoMailBounceAddress(): string | undefined {
  return env("ZEPTOMAIL_BOUNCE_ADDRESS");
}

export function getEmailProvider(): EmailProvider {
  return "zeptomail";
}

export function isEmailConfigured(): boolean {
  return Boolean(getZeptoMailToken());
}

export function getFromAddress(): string {
  return (
    env("EMAIL_FROM_ADDRESS") ??
    env("ZEPTOMAIL_FROM_EMAIL") ??
    "noreply@miyoglobal.com"
  );
}

export function getFromName(): string | undefined {
  return env("EMAIL_FROM_NAME");
}

export function getReplyToAddress(): string | undefined {
  return env("EMAIL_REPLY_TO");
}

export function emailNotConfiguredMessage(): string {
  return "Email is not configured. Set ZEPTOMAIL_API_TOKEN (and EMAIL_FROM_ADDRESS for the From address).";
}
