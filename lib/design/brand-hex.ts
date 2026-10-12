/**
 * Brand hex constants for surfaces that cannot use CSS variables:
 * HTML emails (inline styles), PDFs, QR codes, global-error fallback.
 * In-app UI must use the semantic tokens in globals.css instead.
 */
export const BRAND = {
  gold: "#D4AF37",
  goldDark: "#796001",
  goldSoft: "#FDF7E4",
  ink: "#201E1F",
  inkMuted: "#5C5B57",
  inkSubtle: "#7B7A76",
  border: "#E8E6E2",
  canvas: "#FBFAF6",
  sunken: "#F5F3EF",
  white: "#FFFFFF",
  inkDeep: "#100F0D",
  success: "#137736",
  successSoft: "#E9FDEC",
  warning: "#974C00",
  warningSoft: "#FFF5EE",
  danger: "#AF2C28",
  dangerSoft: "#FFF4F2",
  info: "#2C5CC1",
  infoSoft: "#F3F7FF",
  plum: "#6A48BA",
  plumSoft: "#F7F5FF",
} as const;

export type BrandColor = keyof typeof BRAND;

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
