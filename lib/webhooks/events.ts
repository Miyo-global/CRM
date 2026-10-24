import { z } from "zod";
import { isSafePublicHttpsUrl } from "@/lib/security/ssrf";

/**
 * Event names a webhook endpoint can subscribe to.
 *
 * This list must contain every name the app actually dispatches: subscribing
 * to leave.approved used to return 400 because the enum had drifted from the
 * dispatch sites (QA-0054).
 */
export const WEBHOOK_EVENTS = [
  "lead.created",
  "lead.status_changed",
  "lead.assigned",
  "lead.converted",
  "deal.created",
  "deal.stage_changed",
  "deal.won",
  "deal.lost",
  "resignation.submitted",
  "resignation.approved",
  "termination.submitted",
  "termination.approved",
  "invoice.created",
  "invoice.paid",
  "employee.onboarded",
  "employee.hired",
  "leave.approved",
  // MIYO-0122: project ticket events.
  "ticket.created",
  "ticket.updated",
  "ticket.moved",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];


/** Shared by create and update so an edit cannot bypass the create rules. */
export const webhookUrlSchema = z
  .string()
  .url("Enter a valid URL, for example https://example.com/hook")
  .max(2048, "URL must be at most 2048 characters")
  .startsWith("https://", "URL must start with https://")
  .refine(isSafePublicHttpsUrl, {
    message: "URL must be a public HTTPS endpoint; private, internal, or loopback addresses are not allowed.",
  });

// A webhook with no events never fires, so it must not exist Active (R3-ADM-10).
export const webhookEventsSchema = z
  .array(z.enum(["*", ...WEBHOOK_EVENTS]))
  .min(1, "Select at least one event");
