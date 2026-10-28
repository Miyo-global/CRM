import { createHmac, timingSafeEqual } from "crypto";

/**
 * ZeptoMail webhook helpers (bounce -> email_deliveries.status = 'bounced').
 *
 * ZeptoMail signs each webhook with the mail agent's webhook key:
 * header `producer-signature: ts=<ms>;s=<url-encoded base64 HMAC-SHA256>;s-algorithm=HmacSHA256`.
 * The event is posted either as JSON or as a single form-encoded parameter;
 * Zoho's sample signs the decoded parameter value, so both the raw body and
 * that value are accepted as the signed message (each still needs the secret).
 */

const MAX_SKEW_MS = 5 * 60 * 1000;

/** The event JSON as text: the raw body, or the value of its single form parameter. */
export function eventText(rawBody: string): string {
  const trimmed = rawBody.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return rawBody;
  const first = new URLSearchParams(rawBody).values().next();
  return first.done ? rawBody : first.value;
}

export function verifyZeptoSignature(
  header: string | null,
  rawBody: string,
  secret: string,
  now = Date.now(),
): boolean {
  if (!header || !secret) return false;
  const parts = new Map(
    header.split(";").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()] as const;
    }),
  );
  if (parts.get("s-algorithm") !== "HmacSHA256") return false;

  let ts = Number(parts.get("ts"));
  if (!Number.isFinite(ts) || ts <= 0) return false;
  if (ts < 1e12) ts *= 1000; // seconds, not ms
  if (Math.abs(now - ts) > MAX_SKEW_MS) return false;

  let received: Buffer;
  try {
    received = Buffer.from(decodeURIComponent(parts.get("s") ?? ""), "base64");
  } catch {
    return false;
  }
  if (received.length === 0) return false;

  const candidates = new Set([rawBody, eventText(rawBody)]);
  for (const message of candidates) {
    const expected = createHmac("sha256", secret).update(message).digest();
    if (expected.length === received.length && timingSafeEqual(expected, received)) return true;
  }
  return false;
}

export interface BounceEvent {
  requestId: string;
  reason: string;
}

/** Bounce events in a ZeptoMail webhook payload; other events are ignored. */
export function parseBounces(payload: unknown): BounceEvent[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as { event_name?: unknown; event_message?: unknown };
  const name = Array.isArray(p.event_name) ? p.event_name.join(" ") : String(p.event_name ?? "");
  if (!/bounce/i.test(name)) return [];

  const messages = Array.isArray(p.event_message) ? p.event_message : [p.event_message];
  const out: BounceEvent[] = [];
  for (const m of messages) {
    if (!m || typeof m !== "object") continue;
    const msg = m as {
      request_id?: unknown;
      event_data?: unknown;
    };
    if (typeof msg.request_id !== "string" || !msg.request_id) continue;
    const data = Array.isArray(msg.event_data) ? msg.event_data[0] : msg.event_data;
    const details = (data as { details?: unknown } | undefined)?.details;
    const detail = (Array.isArray(details) ? details[0] : details) as
      | { reason?: unknown; diagnostic_message?: unknown }
      | undefined;
    const reason = [detail?.reason, detail?.diagnostic_message]
      .filter((v): v is string => typeof v === "string" && v.length > 0)
      .join(" — ");
    out.push({ requestId: msg.request_id, reason: `${name}${reason ? `: ${reason}` : ""}` });
  }
  return out;
}
