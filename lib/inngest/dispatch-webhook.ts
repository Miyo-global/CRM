import { inngest } from "./client";
import { logger } from "@/lib/logger";


export async function dispatchWebhook(
  orgId: string,
  eventName: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await inngest.send({
      name: "webhook/dispatch" as never,
      data: { orgId, eventName, payload },
    });
  } catch (error) {
    logger.error("Failed to enqueue webhook dispatch", { orgId, eventName, error });
  }
}
