/** Shared shapes for the mail layer. Kept provider-agnostic on purpose: the
 *  public `sendEmail()` contract must not change when the transport does. */

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  /** MIME type, e.g. "application/pdf" or "text/csv". */
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
  replyTo?: string;
}

/** An `EmailOptions` after defaults, trimming and de-duplication have been
 *  applied. Providers only ever see this shape. */
export interface NormalizedEmail {
  to: string[];
  cc: string[];
  bcc: string[];
  from: { address: string; name?: string };
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  attachments: { filename: string; base64: string; type: string }[];
}

/**
 * Transport failure carrying enough context for the retry loop to decide
 * whether another attempt is worthwhile, and for logs to be actionable.
 */
export class EmailSendError extends Error {
  readonly provider: string;
  readonly statusCode?: number;
  readonly providerCode?: string;
  readonly retryable: boolean;
  readonly details?: unknown;

  constructor(params: {
    provider: string;
    message: string;
    statusCode?: number;
    providerCode?: string;
    retryable: boolean;
    details?: unknown;
    cause?: unknown;
  }) {
    super(params.message, params.cause !== undefined ? { cause: params.cause } : undefined);
    this.name = "EmailSendError";
    this.provider = params.provider;
    this.statusCode = params.statusCode;
    this.providerCode = params.providerCode;
    this.retryable = params.retryable;
    this.details = params.details;
  }
}
