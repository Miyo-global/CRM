import { format } from "date-fns";
import type { AbTest } from "@/lib/api/hooks/marketing";

export function calcOpenRate(opens: number, sent: number): number {
  if (sent === 0) return 0;
  return Math.min(100, Math.round((opens / sent) * 100 * 10) / 10);
}

export function calcClickRate(clicks: number, sent: number): number {
  if (sent === 0) return 0;
  return Math.min(100, Math.round((clicks / sent) * 100 * 10) / 10);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return "";
  }
}

export const STATUS_BADGE: Record<
  AbTest["status"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  running: { label: "Running", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  paused: { label: "Paused", variant: "secondary" },
};

export const EMPTY_FORM = {
  name: "",
  description: "",
  variantASubject: "",
  variantBSubject: "",
  variantABody: "",
  variantBBody: "",
  splitPercent: 50,
  audienceSize: 0,
};

export type AbTestForm = typeof EMPTY_FORM;
