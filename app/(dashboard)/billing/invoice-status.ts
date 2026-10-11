import type { Tone } from "@/lib/design/tones";
import type { InvoiceStatus } from "@/types/invoice";

/** Invoice status → label + tone (rendered with StatusPill). */
export const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  SENT: { label: "Sent", tone: "info" },
  PAID: { label: "Paid", tone: "success" },
  OVERDUE: { label: "Overdue", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};
