import { logger } from "@/lib/logger";
import { deliverWebhookEventDirect } from "@/lib/webhooks/deliver";

/**
 * Delivers an event to the org's webhook endpoints, in this process. Never
 * throws: callers fire it and move on.
 */
export async function dispatchWebhook(
  orgId: string,
  eventName: string,
  payload: Record<string, unknown>
): Promise<void> {
  const result = await deliverWebhookEventDirect(orgId, eventName, payload).catch((error) => {
    logger.error("Direct webhook delivery failed", { orgId, eventName, error });
    return null;
  });
  if (result) {
    logger.info("Webhook delivered directly", { orgId, eventName, ...result });
  }
}
