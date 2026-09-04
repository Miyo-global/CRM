import { logger } from "../logger";
import { appUrl } from "../app-url";
import {
  getEmailProvider,
  getFromAddress,
  getFromName,
  getReplyToAddress,
  isEmailConfigured,
} from "./config";
import { sendViaZeptoMail } from "./providers/zeptomail";
import { sendViaSendGrid } from "./providers/sendgrid";
import { EmailSendError, type EmailOptions, type NormalizedEmail } from "./types";

export type { EmailAttachment, EmailOptions } from "./types";
export { EmailSendError } from "./types";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export const baseUrl = appUrl;

function toList(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  const seen = new Set<string>();
  for (const entry of values) {
    const trimmed = entry?.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen];
}

function htmlToText(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function normalize(options: EmailOptions): NormalizedEmail {
  const name = getFromName();
  return {
    to: toList(options.to),
    cc: toList(options.cc),
    bcc: toList(options.bcc),
    from: { address: getFromAddress(), ...(name ? { name } : {}) },
    replyTo: options.replyTo?.trim() || getReplyToAddress(),
    subject: options.subject,
    html: options.html,
    text: options.text || htmlToText(options.html),
    attachments:
      options.attachments?.map((a) => ({
        filename: a.filename,
        type: a.type,
        base64: Buffer.isBuffer(a.content) ? a.content.toString("base64") : a.content,
      })) ?? [],
  };
}

/** Errors that predate the provider refactor (or come from elsewhere) still
 *  need a verdict, so fall back to inspecting the shape. */
function isRetryable(error: unknown): boolean {
  if (error instanceof EmailSendError) return error.retryable;

  if (error && typeof error === "object") {
    const code = (error as { code?: number | string }).code;
    if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code === "EAI_AGAIN") {
      return true;
    }
    const statusCode =
      (error as { statusCode?: number }).statusCode ?? (typeof code === "number" ? code : undefined);
    if (typeof statusCode === "number") {
      if (statusCode >= 500 || statusCode === 429) return true;
      if (statusCode >= 400) return false;
    }
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function dispatch(email: NormalizedEmail): Promise<{ requestId?: string }> {
  if (getEmailProvider() === "sendgrid") {
    await sendViaSendGrid(email);
    return {};
  }
  return sendViaZeptoMail(email);
}

/**
 * Sends a transactional email through the configured provider (ZeptoMail by
 * default), retrying transient failures with exponential backoff.
 *
 * No-ops with a warning when mail is not configured, so a deployment without
 * credentials degrades instead of breaking the request that triggered it.
 * Permanent failures — unverified sender, bad key, invalid address — throw.
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const email = normalize(options);
  const provider = getEmailProvider();

  if (!isEmailConfigured()) {
    logger.warn("EMAIL_SKIPPED: mail provider not configured", {
      provider,
      to: email.to,
      subject: email.subject,
    });
    return;
  }

  if (email.to.length === 0) {
    logger.warn("EMAIL_SKIPPED: no recipients", { provider, subject: email.subject });
    return;
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await dispatch(email);
      logger.info("Email sent", {
        provider,
        to: email.to,
        subject: email.subject,
        ...(result.requestId ? { requestId: result.requestId } : {}),
      });
      return;
    } catch (error) {
      lastError = error;

      if (!isRetryable(error)) {
        logger.error("Email send failed (non-retryable)", {
          provider,
          to: email.to,
          subject: email.subject,
          attempt,
          error: error instanceof Error ? error.message : error,
        });
        throw error;
      }

      if (attempt < MAX_RETRIES) {
        const backoff = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        logger.warn(`Email retry ${attempt}/${MAX_RETRIES}`, {
          provider,
          to: email.to,
          nextRetryMs: backoff,
          error: error instanceof Error ? error.message : error,
        });
        await delay(backoff);
      }
    }
  }

  logger.error("Email send failed after all retries", {
    provider,
    to: email.to,
    subject: email.subject,
    error: lastError instanceof Error ? lastError.message : lastError,
  });
  throw lastError;
}
