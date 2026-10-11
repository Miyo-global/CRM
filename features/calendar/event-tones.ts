import type { CSSProperties } from "react";
import { toneVar, type Tone } from "@/lib/design/tones";

/** Stored event `color` keys (user data — unchanged) → design tones. */
export const EVENT_COLOR_TONES: Record<string, Tone> = {
  blue: "info",
  green: "success",
  red: "danger",
  yellow: "warning",
  purple: "plum",
  gold: "brand",
};

export const RSVP_TONES: Record<string, Tone> = {
  accepted: "success",
  declined: "danger",
  tentative: "warning",
};

export function eventColorTone(key?: string | null): Tone {
  return EVENT_COLOR_TONES[key ?? "blue"] ?? "info";
}

/** Per-event CSS vars consumed by styles/vendors/react-big-calendar.css. */
export function eventToneStyle(tone: Tone): CSSProperties {
  return {
    "--event-tone": toneVar[tone],
    "--event-soft": `var(--${tone}-soft)`,
    "--event-strong": tone === "brand" ? "var(--brand-soft-foreground)" : `var(--${tone}-strong)`,
  } as CSSProperties;
}
