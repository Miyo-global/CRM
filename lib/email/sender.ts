import sgMail from "@sendgrid/mail";
import { logger } from "../logger";
import { appUrl } from "../app-url";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export const baseUrl = appUrl;

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  type: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  cc?: string | string[];
  bcc?: string | string[];
}

function isTransientError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const code = (error as { code?: number | string }).code;
    if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code === "EAI_AGAIN") {
      return true;
    }
    const statusCode = (error as { code?: number; statusCode?: number }).statusCode ?? (typeof code === "number" ? code : undefined);
    if (typeof statusCode === "number") {
      if (statusCode >= 500 && statusCode < 600) return true;
      if (statusCode >= 400 && statusCode < 500) return false;
    }
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendEmail(options: EmailOptions) {
  const fromEmail = process.env.EMAIL_FROM_ADDRESS || process.env.SENDGRID_FROM_EMAIL || "noreply@miyoglobal.com";

  const toList = Array.isArray(options.to) ? options.to : [options.to];

  if (!process.env.SENDGRID_API_KEY) {
    logger.warn("EMAIL_SKIPPED: No SENDGRID_API_KEY configured", { to: toList, subject: options.subject });
    return;
  }

  const attachments = options.attachments?.map((a) => ({
    content: Buffer.isBuffer(a.content) ? a.content.toString("base64") : a.content,
    filename: a.filename,
    type: a.type,
    disposition: "attachment" as const,
  }));

  const ccList = options.cc
    ? (Array.isArray(options.cc) ? options.cc : [options.cc]).filter(Boolean)
    : undefined;
  const bccList = options.bcc
    ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]).filter(Boolean)
    : undefined;

  const msg: sgMail.MailDataRequired = {
    to: toList,
    from: fromEmail,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]*>/g, ""),
    ...(attachments?.length ? { attachments } : {}),
    ...(ccList?.length ? { cc: ccList } : {}),
    ...(bccList?.length ? { bcc: bccList } : {}),
    trackingSettings: {
      clickTracking: {
        enable: false,
        enableText: false,
      },
    },
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sgMail.send(msg);
      logger.info("Email sent", { to: toList, subject: options.subject });
      return;
    } catch (error) {
      lastError = error;

      if (!isTransientError(error)) {
        logger.error("Email send failed (non-retryable)", { to: toList, subject: options.subject, attempt, error });
        throw error;
      }

      if (attempt < MAX_RETRIES) {
        const backoff = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        logger.warn(`Email retry ${attempt}/${MAX_RETRIES}`, { to: toList, nextRetryMs: backoff });
        await delay(backoff);
      }
    }
  }

  logger.error("Email send failed after all retries", { to: toList, subject: options.subject, error: lastError });
  throw lastError;
}
