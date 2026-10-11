import type { Tone } from "@/lib/design/tones";

/** Deal stage → tone (matches DEAL_STAGES dots in features/crm/shared/constants.ts). */
export const DEAL_STAGE_TONE: Record<string, Tone> = {
  LEAD: "info",
  CONTACTED: "teal",
  PROPOSAL: "warning",
  NEGOTIATION: "plum",
  WON: "success",
  LOST: "danger",
};
