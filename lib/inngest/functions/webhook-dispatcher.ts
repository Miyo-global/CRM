import { inngest } from "../client";
import {
  deliverToEndpoint,
  endpointsForEvent,
  WEBHOOK_SIGNATURE_HEADER,
  webhookHeaders,
} from "@/lib/webhooks/deliver";

// Re-exported so existing importers (and the docs page) keep working.
export { WEBHOOK_SIGNATURE_HEADER, webhookHeaders };

export const webhookDispatcher = inngest.createFunction(
  { id: "webhook-dispatcher", name: "Dispatch Webhook Events", triggers: { event: "webhook/dispatch" } },
  async ({ event, step }) => {
    const { orgId, eventName, payload } = event.data as {
      orgId: string;
      eventName: string;
      payload: Record<string, unknown>;
    };

    const endpoints = await step.run("fetch-endpoints", () =>
      endpointsForEvent(orgId, eventName),
    );

    await Promise.allSettled(
      endpoints.map((ep) =>
        step.run(`deliver-${ep.id}`, () => deliverToEndpoint(orgId, ep, eventName, payload)),
      ),
    );

    return { dispatched: endpoints.length };
  },
);
