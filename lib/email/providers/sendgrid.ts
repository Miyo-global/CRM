import sgMail from "@sendgrid/mail";
import { getSendGridApiKey } from "../config";
import { EmailSendError, type NormalizedEmail } from "../types";

const PROVIDER = "sendgrid";

let configuredKey: string | undefined;

/** Set lazily so a key added after module load (scripts, tests) still applies. */
function ensureApiKey(): string {
  const key = getSendGridApiKey();
  if (!key) {
    throw new EmailSendError({
      provider: PROVIDER,
      message: "SENDGRID_API_KEY is not set",
      retryable: false,
    });
  }
  if (key !== configuredKey) {
    sgMail.setApiKey(key);
    configuredKey = key;
  }
  return key;
}

function statusOf(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const { code, statusCode } = error as { code?: number | string; statusCode?: number };
  if (typeof statusCode === "number") return statusCode;
  if (typeof code === "number") return code;
  return undefined;
}

function isTransport(error: unknown): boolean {
  const code = (error as { code?: number | string } | null)?.code;
  return code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code === "EAI_AGAIN";
}

/** Retained so an existing deployment can fall back with EMAIL_PROVIDER=sendgrid. */
export async function sendViaSendGrid(email: NormalizedEmail): Promise<void> {
  ensureApiKey();

  const msg: sgMail.MailDataRequired = {
    to: email.to,
    from: email.from.name
      ? { email: email.from.address, name: email.from.name }
      : email.from.address,
    subject: email.subject,
    html: email.html,
    text: email.text,
    ...(email.cc.length ? { cc: email.cc } : {}),
    ...(email.bcc.length ? { bcc: email.bcc } : {}),
    ...(email.replyTo ? { replyTo: email.replyTo } : {}),
    ...(email.attachments.length
      ? {
          attachments: email.attachments.map((a) => ({
            content: a.base64,
            filename: a.filename,
            type: a.type,
            disposition: "attachment" as const,
          })),
        }
      : {}),
    trackingSettings: {
      clickTracking: { enable: false, enableText: false },
    },
  };

  try {
    await sgMail.send(msg);
  } catch (cause) {
    const status = statusOf(cause);
    throw new EmailSendError({
      provider: PROVIDER,
      message: cause instanceof Error ? cause.message : String(cause),
      statusCode: status,
      retryable: isTransport(cause) || (status !== undefined && (status >= 500 || status === 429)),
      cause,
    });
  }
}
