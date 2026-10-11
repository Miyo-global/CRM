/** Shared recharts styling (Gold & Ink §8.8). */
import { CHART_VARS } from "@/lib/design/tones";

export const CHART_COLORS: readonly string[] = CHART_VARS;

/** Recharts tooltip styled as a popover card (Gold & Ink §8.8). */
export const CHART_TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  color: "var(--popover-foreground)",
  fontSize: 12,
  boxShadow: "var(--shadow-md)",
} as const;

export const AXIS_TICK = { fill: "var(--chart-axis)", fontSize: 11 } as const;

/** Spread onto <CartesianGrid />. */
export const CHART_GRID = { stroke: "var(--chart-grid)", strokeDasharray: "3 3", vertical: false } as const;

/** Spread onto <XAxis /> / <YAxis />. */
export const CHART_AXIS = { tick: AXIS_TICK, tickLine: false, axisLine: false } as const;
