/**
 * Single source of truth for outbound-mail configuration.
 *
 * Everything that needs to know "can this deployment send mail, and as whom?"
 * asks here — API routes, the health check, the notification helpers and the
 * test scripts — so adding or swapping a provider is a one-file change.
 */

export type EmailProvider = "zeptomail" | "sendgrid";

/** Reads an env var, treating whitespace-only as unset. Hosting platforms
 *  routinely define a variable with an empty value, so `??` is not enough. */
function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/** ZeptoMail's default (US/global) data centre. Other regions — .eu, .in,
 *  .com.au, .ca, .jp, .sa — are selected with ZEPTOMAIL_API_URL. */
const DEFAULT_ZEPTOMAIL_API_URL = "https://api.zeptomail.com/v1.1/email";

const AUTH_SCHEME = "Zoho-enczapikey";

/**
 * The ZeptoMail "Send Mail Token".
 *
 * Zoho's console offers the value both bare and pre-prefixed with
 * `Zoho-enczapikey `; pasting the prefixed form is the single most common
 * setup mistake, so the prefix is stripped here rather than doubled up later.
 */
export function getZeptoMailToken(): string | undefined {
  const raw = env("ZEPTOMAIL_TOKEN") ?? env("ZEPTOMAIL_API_KEY");
  if (!raw) return undefined;
  const withoutScheme = raw.replace(new RegExp(`^${AUTH_SCHEME}\\s+`, "i"), "").trim();
  return withoutScheme || undefined;
}

/** Value for the `Authorization` header ZeptoMail expects. */
export function getZeptoMailAuthHeader(): string | undefined {
  const token = getZeptoMailToken();
  return token ? `${AUTH_SCHEME} ${token}` : undefined;
}

export function getZeptoMailApiUrl(): string {
  return env("ZEPTOMAIL_API_URL") ?? DEFAULT_ZEPTOMAIL_API_URL;
}

/** Optional custom bounce address configured on the ZeptoMail Mail Agent. */
export function getZeptoMailBounceAddress(): string | undefined {
  return env("ZEPTOMAIL_BOUNCE_ADDRESS");
}

export function getSendGridApiKey(): string | undefined {
  return env("SENDGRID_API_KEY");
}

/**
 * Which transport to use. An explicit EMAIL_PROVIDER wins; otherwise we pick
 * whichever credential is actually present so a deployment that only pastes a
 * ZeptoMail token still sends.
 */
export function getEmailProvider(): EmailProvider {
  const configured = env("EMAIL_PROVIDER")?.toLowerCase();
  if (configured === "sendgrid") return "sendgrid";
  if (configured === "zeptomail" || configured === "zepto" || configured === "zoho") {
    return "zeptomail";
  }

  if (getZeptoMailToken()) return "zeptomail";
  if (getSendGridApiKey()) return "sendgrid";
  return "zeptomail";
}

/** True when the selected provider has the credentials it needs. */
export function isEmailConfigured(): boolean {
  return getEmailProvider() === "zeptomail"
    ? Boolean(getZeptoMailToken())
    : Boolean(getSendGridApiKey());
}

export function getFromAddress(): string {
  return (
    env("EMAIL_FROM_ADDRESS") ??
    env("ZEPTOMAIL_FROM_EMAIL") ??
    env("SENDGRID_FROM_EMAIL") ??
    "noreply@miyoglobal.com"
  );
}

export function getFromName(): string | undefined {
  return env("EMAIL_FROM_NAME");
}

export function getReplyToAddress(): string | undefined {
  return env("EMAIL_REPLY_TO");
}

/**
 * User-facing explanation for a 400 when mail is not set up. Names the env var
 * for the provider actually in force, so the message stays correct after a swap.
 */
export function emailNotConfiguredMessage(): string {
  return getEmailProvider() === "zeptomail"
    ? "Email is not configured. Set ZEPTOMAIL_TOKEN (and EMAIL_FROM_ADDRESS for the From address)."
    : "Email is not configured. Set SENDGRID_API_KEY (and EMAIL_FROM_ADDRESS for the From address).";
}
