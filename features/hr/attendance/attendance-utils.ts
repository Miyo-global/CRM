import { toneDot, toneSoft, toneText } from "@/lib/design/tones";

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export interface CalendarDay {
  date: Date;
  status: "present" | "wfh" | "leave" | "absent" | "weekend" | "holiday" | "future" | "none";
  holidayName?: string;
}

// Calendar day cells: soft tone fill + strong text; legend dots use toneDot.
export const statusConfig = {
  present: { label: "Present", bg: "bg-success-soft", text: toneText.success, dot: toneDot.success },
  wfh: { label: "WFH", bg: "bg-info-soft", text: toneText.info, dot: toneDot.info },
  leave: { label: "Leave", bg: "bg-warning-soft", text: toneText.warning, dot: toneDot.warning },
  absent: { label: "Absent", bg: "bg-danger-soft", text: toneText.danger, dot: toneDot.danger },
  weekend: { label: "Weekend", bg: "bg-muted", text: "text-muted-foreground", dot: toneDot.neutral },
  holiday: { label: "Holiday", bg: "bg-brand-soft", text: toneText.brand, dot: toneDot.brand },
  future: { label: "", bg: "", text: "", dot: "" },
  none: { label: "", bg: "", text: "", dot: "" },
} as const;

export const tableStatusBadge: Record<string, string> = {
  PRESENT: toneSoft.success,
  ABSENT: toneSoft.danger,
  ON_BREAK: toneSoft.warning,
  CHECKED_OUT: toneSoft.neutral,
};

export function formatDuration(hours: string | number | null | undefined): string {
  const h = typeof hours === "string" ? parseFloat(hours) : (hours ?? 0);
  if (h <= 0) return "0h 0m";
  const wholeHours = Math.floor(h);
  const minutes = Math.round((h - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
}

export function formatTimerSegment(val: number): string {
  return String(val).padStart(2, "0");
}
