/**
 * Gold & Ink tone system — the only place status/category colors are defined.
 * Every status/priority/category color map in the app returns one of these
 * class strings so light/dark switching happens through CSS tokens.
 */
export type Tone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "teal"
  | "plum";

export const TONES: readonly Tone[] = [
  "neutral",
  "brand",
  "success",
  "warning",
  "danger",
  "info",
  "teal",
  "plum",
];

/** Soft pill / chip: tinted background + strong text. */
export const toneSoft: Record<Tone, string> = {
  neutral: "bg-neutral-soft text-neutral-strong",
  brand: "bg-brand-soft text-brand-soft-foreground",
  success: "bg-success-soft text-success-strong",
  warning: "bg-warning-soft text-warning-strong",
  danger: "bg-danger-soft text-danger-strong",
  info: "bg-info-soft text-info-strong",
  teal: "bg-teal-soft text-teal-strong",
  plum: "bg-plum-soft text-plum-strong",
};

/** Strong text color only (icons, inline status words). */
export const toneText: Record<Tone, string> = {
  neutral: "text-neutral-strong",
  brand: "text-brand-text",
  success: "text-success-strong",
  warning: "text-warning-strong",
  danger: "text-danger-strong",
  info: "text-info-strong",
  teal: "text-teal-strong",
  plum: "text-plum-strong",
};

/** Small status dot. */
export const toneDot: Record<Tone, string> = {
  neutral: "bg-ink-400",
  brand: "bg-gold-400",
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
  info: "bg-info-500",
  teal: "bg-teal-500",
  plum: "bg-plum-500",
};

/** Solid fill with readable foreground. */
export const toneSolid: Record<Tone, string> = {
  neutral: "bg-ink-700 text-white",
  brand: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  danger: "bg-destructive text-destructive-foreground",
  info: "bg-info text-info-foreground",
  teal: "bg-teal-700 text-white",
  plum: "bg-plum-700 text-white",
};

/** Progress / heat bars. */
export const toneBar: Record<Tone, string> = {
  neutral: "bg-ink-300",
  brand: "bg-gold-400",
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
  info: "bg-info-500",
  teal: "bg-teal-500",
  plum: "bg-plum-500",
};

/** Left/top accent border. */
export const toneBorder: Record<Tone, string> = {
  neutral: "border-ink-300",
  brand: "border-gold-400",
  success: "border-success-500",
  warning: "border-warning-500",
  danger: "border-danger-500",
  info: "border-info-500",
  teal: "border-teal-500",
  plum: "border-plum-500",
};

/** CSS variable references for charts / SVG / inline styles. */
export const toneVar: Record<Tone, string> = {
  neutral: "var(--ink-400)",
  brand: "var(--gold-400)",
  success: "var(--success-500)",
  warning: "var(--warning-500)",
  danger: "var(--danger-500)",
  info: "var(--info-500)",
  teal: "var(--teal-500)",
  plum: "var(--plum-500)",
};

/** Categorical series colors, in the order charts should use them. */
export const CHART_VARS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
] as const;

/** Cycle for free-form categorical tags. */
export const TAG_TONE_CYCLE: readonly Tone[] = [
  "info",
  "teal",
  "plum",
  "brand",
  "warning",
  "success",
];

/** Deterministic tone for an arbitrary string (tags, categories). */
export function toneForKey(key: string): Tone {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return TAG_TONE_CYCLE[Math.abs(h) % TAG_TONE_CYCLE.length];
}

/** Hex values of the 8 chart tokens (light mode) — for color-picker presets only. */
export const CHART_PRESET_HEX = [
  "#BF9A15",
  "#43423F",
  "#3E78F2",
  "#2B9287",
  "#8861E9",
  "#EC7C11",
  "#25984A",
  "#FF6459",
] as const;
