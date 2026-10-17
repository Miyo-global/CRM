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
