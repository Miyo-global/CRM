import type { Tone } from "@/lib/design/tones";

/** Project status → tone (mirrors projectStatusColors in lib/theme-constants). */
export const projectStatusTone: Record<string, Tone> = {
  ACTIVE: "success",
  PLANNING: "info",
  COMPLETED: "neutral",
  ON_HOLD: "warning",
  ARCHIVED: "neutral",
};
