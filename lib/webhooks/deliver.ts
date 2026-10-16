import "server-only";
import { db } from "@/lib/db";
import { webhookEndpoints, webhookLogs } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { createHmac } from "crypto";
import { isSafePublicHttpsUrl } from "@/lib/security/ssrf";
import { logger } from "@/lib/logger";

/** Header carrying `sha256=<hex HMAC of the raw body>`, keyed by the endpoint secret. */
export const WEBHOOK_SIGNATURE_HEADER = "X-Miyo-Signature";

export function webhookHeaders(eventName: string, signature: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    [WEBHOOK_SIGNATURE_HEADER]: `sha256=${signature}`,
    "X-Webhook-Event": eventName,
  };
}

export interface WebhookEndpointRow {
  id: number;
  url: string;
  secret: string;
}

/** Active endpoints subscribed to this event (an empty subscription means all). */
export async function endpointsForEvent(
  orgId: string,
  eventName: string,
): Promise<WebhookEndpointRow[]> {
  const endpoints = await db.query.webhookEndpoints.findMany({
    where: and(eq(webhookEndpoints.orgId, orgId), eq(webhookEndpoints.isActive, true)),
  });

  return endpoints
    .filter((ep) => {
      const events = (ep.events as string[]) ?? [];
      return events.length === 0 || events.includes(eventName) || events.includes("*");
    })
    .map((ep) => ({ id: ep.id, url: ep.url, secret: ep.secret }));
}

/**
 * Signs and POSTs one delivery, logging the attempt.
 *
 * Throws on failure so the caller (Inngest step, or the direct retry loop) can
 * retry it.
 */
export async function deliverToEndpoint(
  orgId: string,
  endpoint: WebhookEndpointRow,
  eventName: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const body = JSON.stringify({
    event: eventName,
    data: payload,
    timestamp: new Date().toISOString(),
  });
  const signature = createHmac("sha256", endpoint.secret).update(body).digest("hex");

  // Re-validate at dispatch time: blocks SSRF from rows created before this
  // guard existed, and narrows the DNS-rebinding window.
  if (!isSafePublicHttpsUrl(endpoint.url)) {
    await db.insert(webhookLogs).values({
      endpointId: endpoint.id,
      orgId,
      event: eventName,
      payload,
      statusCode: null,
      responseBody: "Blocked: endpoint URL is not a public HTTPS address.",
      success: false,
    });
    throw new Error("Webhook delivery blocked: non-public URL");
  }

  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let success = false;

  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: webhookHeaders(eventName, signature),
      body,
      signal: AbortSignal.timeout(10_000),
    });
    statusCode = res.status;
    responseBody = await res.text().catch(() => null);
    success = res.ok;
  } catch (deliveryErr) {
    responseBody = deliveryErr instanceof Error ? deliveryErr.message : "Request failed";
  }

  await db.insert(webhookLogs).values({
    endpointId: endpoint.id,
    orgId,
    event: eventName,
    payload,
    statusCode,
    responseBody: responseBody?.slice(0, 2000) ?? null,
    success,
  });

  if (!success) throw new Error(`Webhook delivery failed: ${statusCode ?? "no response"}`);
}

/**
 * Delivers an event to every subscribed endpoint, in this process.
 *
 * Used when Inngest is not configured, where enqueueing silently went nowhere
 * and nothing was ever delivered (QA-0054). Three attempts with a short
 * backoff; every attempt is logged.
 */
export async function deliverWebhookEventDirect(
  orgId: string,
  eventName: string,
  payload: Record<string, unknown>,
): Promise<{ delivered: number; failed: number }> {
  const endpoints = await endpointsForEvent(orgId, eventName);
  let delivered = 0;
  let failed = 0;

  for (const endpoint of endpoints) {
    let ok = false;
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        await deliverToEndpoint(orgId, endpoint, eventName, payload);
        ok = true;
      } catch (error) {
        logger.warn("Webhook delivery attempt failed", {
          orgId,
          eventName,
          endpointId: endpoint.id,
          attempt,
          error: error instanceof Error ? error.message : "Unknown",
        });
        if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }
    if (ok) delivered++;
    else failed++;
  }

  return { delivered, failed };
}
