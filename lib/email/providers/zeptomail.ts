import {
  getZeptoMailApiUrl,
  getZeptoMailAuthHeader,
  getZeptoMailBounceAddress,
} from "../config";
import { EmailSendError, type NormalizedEmail } from "../types";

const PROVIDER = "zeptomail";

/** ZeptoMail rejects a single request carrying more than 25 addresses across
 *  to + cc + bcc. Splitting is the caller's job; we fail loudly instead of
 *  letting the provider swallow the overflow. */
const MAX_RECIPIENTS_PER_REQUEST = 25;

const REQUEST_TIMEOUT_MS = 20_000;

interface ZeptoAddress {
  address: string;
  name?: string;
}

interface ZeptoRecipient {
  email_address: ZeptoAddress;
}

interface ZeptoMailRequest {
  from: ZeptoAddress;
  to: ZeptoRecipient[];
  cc?: ZeptoRecipient[];
  bcc?: ZeptoRecipient[];
  reply_to?: ZeptoAddress[];
  subject: string;
  htmlbody?: string;
  textbody?: string;
  attachments?: { name: string; mime_type: string; content: string }[];
  bounce_address?: string;
  track_clicks: boolean;
  track_opens: boolean;
}

interface ZeptoErrorDetail {
  code?: string;
  message?: string;
  target?: string;
}

interface ZeptoMailResponse {
  data?: { code?: string; message?: string }[];
  message?: string;
  request_id?: string;
  error?: {
    code?: string;
    message?: string;
    details?: ZeptoErrorDetail[];
    request_id?: string;
  };
}

function toRecipients(addresses: string[]): ZeptoRecipient[] {
  return addresses.map((address) => ({ email_address: { address } }));
}

/** 5xx and 429 are worth another attempt; every other 4xx is a request the
 *  provider will keep rejecting (bad key, unverified sender, invalid address). */
function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

function describeError(status: number, body: ZeptoMailResponse | undefined, rawBody: string): string {
  const error = body?.error;
  const detail = error?.details
    ?.map((d) => [d.target, d.message ?? d.code].filter(Boolean).join(": "))
    .filter(Boolean)
    .join("; ");

  const parts = [
    `ZeptoMail responded ${status}`,
    error?.code,
    error?.message ?? body?.message,
    detail,
  ].filter(Boolean);

  // Fall back to the raw body when the payload was not the documented shape,
  // otherwise a proxy/HTML error page would surface as an empty message.
  return parts.length > 1 ? parts.join(" — ") : `ZeptoMail responded ${status} — ${rawBody.slice(0, 500)}`;
}

/**
 * Sends one message through the ZeptoMail Email Sending API.
 *
 * Throws `EmailSendError` on any non-2xx response or transport failure; the
 * caller (`sendEmail`) owns retries and logging.
 */
export async function sendViaZeptoMail(email: NormalizedEmail): Promise<{ requestId?: string }> {
  const authorization = getZeptoMailAuthHeader();
  if (!authorization) {
    throw new EmailSendError({
      provider: PROVIDER,
      message: "ZEPTOMAIL_TOKEN is not set",
      retryable: false,
    });
  }

  const recipientCount = email.to.length + email.cc.length + email.bcc.length;
  if (recipientCount > MAX_RECIPIENTS_PER_REQUEST) {
    throw new EmailSendError({
      provider: PROVIDER,
      message: `ZeptoMail allows at most ${MAX_RECIPIENTS_PER_REQUEST} recipients per request, got ${recipientCount}`,
      retryable: false,
    });
  }

  const payload: ZeptoMailRequest = {
    from: email.from.name
      ? { address: email.from.address, name: email.from.name }
      : { address: email.from.address },
    to: toRecipients(email.to),
    subject: email.subject,
    htmlbody: email.html,
    textbody: email.text,
    track_clicks: false,
    track_opens: false,
    ...(email.cc.length ? { cc: toRecipients(email.cc) } : {}),
    ...(email.bcc.length ? { bcc: toRecipients(email.bcc) } : {}),
    ...(email.replyTo ? { reply_to: [{ address: email.replyTo }] } : {}),
    ...(email.attachments.length
      ? {
          attachments: email.attachments.map((a) => ({
            name: a.filename,
            mime_type: a.type,
            content: a.base64,
          })),
        }
      : {}),
  };

  const bounceAddress = getZeptoMailBounceAddress();
  if (bounceAddress) payload.bounce_address = bounceAddress;

  let response: Response;
  try {
    response = await fetch(getZeptoMailApiUrl(), {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    // DNS failures, resets and timeouts — all worth retrying.
    throw new EmailSendError({
      provider: PROVIDER,
      message: `ZeptoMail request failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      retryable: true,
      cause,
    });
  }

  const rawBody = await response.text();
  let parsed: ZeptoMailResponse | undefined;
  try {
    parsed = rawBody ? (JSON.parse(rawBody) as ZeptoMailResponse) : undefined;
  } catch {
    parsed = undefined;
  }

  if (!response.ok) {
    throw new EmailSendError({
      provider: PROVIDER,
      message: describeError(response.status, parsed, rawBody),
      statusCode: response.status,
      providerCode: parsed?.error?.code,
      retryable: isRetryableStatus(response.status),
      details: parsed?.error?.details,
    });
  }

  return { requestId: parsed?.request_id };
}
