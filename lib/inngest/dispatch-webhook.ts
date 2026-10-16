import { inngest } from "./client";
import { logger } from "@/lib/logger";
import { deliverWebhookEventDirect } from "@/lib/webhooks/deliver";

/**
 * Hands an event to the webhook dispatcher.
 *
 * Without an Inngest event key, inngest.send() goes nowhere and endpoints
 * never received anything (QA-0054), so the event is delivered in-process
 * instead — and also as a fallback when enqueueing fails.
 */
export async function dispatchWebhook(
  orgId: string,
  eventName: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!process.env.INNGEST_EVENT_KEY) {
    const result = await deliverWebhookEventDirect(orgId, eventName, payload).catch((error) => {
      logger.error("Direct webhook delivery failed", { orgId, eventName, error });
      return null;
    });
    if (result) {
      logger.info("Webhook delivered directly", { orgId, eventName, ...result });
    }
    return;
  }

  try {
    await inngest.send({
      name: "webhook/dispatch" as never,
      data: { orgId, eventName, payload },
    });
  } catch (error) {
    logger.error("Failed to enqueue webhook dispatch, delivering directly", {
      orgId,
      eventName,
      error,
    });
    await deliverWebhookEventDirect(orgId, eventName, payload).catch((deliveryError) => {
      logger.error("Direct webhook delivery failed", { orgId, eventName, error: deliveryError });
    });
  }
}
