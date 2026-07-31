import {
  Phone, Target, UserCheck, X, Zap, Eye,
} from "lucide-react";
import type React from "react";

export const STATUSES = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"] as const;

export const LEAD_SOURCES = ["referral", "campaign", "cold_call", "website", "social_media", "walk_in", "other"] as const;

export const LEAD_PRIORITIES = ["HOT", "WARM", "COLD"] as const;

export const ACTIVITY_TYPES = ["call", "email", "whatsapp", "meeting", "site_visit"] as const;

// Pipeline stages are CATEGORICAL (6 distinct hues), not a success/warning/error
// scale — so hues stay. Two fixes: (1) light-mode text now uses -600 (AA on white)
// with dark:-400 (bright on dark cards); the old single -400 failed AA on light.
// (2) CONVERTED/LOST map to the semantic success/destructive tokens (theme-adaptive).
export const STATUS_CONFIG: Record<
  (typeof STATUSES)[number],
  { label: string; color: string; bg: string; border: string; icon: React.ElementType }
> = {
  NEW: { label: "New", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Zap },
  CONTACTED: { label: "Contacted", color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20", icon: Phone },
  INTERESTED: { label: "Interested", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Eye },
  QUALIFIED: { label: "Qualified", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", icon: Target },
  CONVERTED: { label: "Converted", color: "text-success", bg: "bg-success/10", border: "border-success/20", icon: UserCheck },
  LOST: { label: "Lost", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20", icon: X },
};

// Lead source is purely categorical (no good/bad meaning) → keep distinct hues,
// only fix light-mode contrast. `other` uses the neutral muted token.
export const SOURCE_COLORS: Record<string, string> = {
  referral: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
  campaign: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  cold_call: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/20",
  website: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/20",
  social_media: "bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-500/20",
  walk_in: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
  other: "bg-muted text-muted-foreground border-border",
};

// DECISION: Priority red/amber/blue encode HEAT (HOT lead = good!), not status.
// Mapping HOT→destructive would invert meaning, so hues stay; contrast is fixed.
export const PRIORITY_CONFIG = {
  HOT: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  WARM: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  COLD: "bg-blue-400/15 text-blue-700 dark:text-blue-400 border-blue-400/30",
} as const;

export function isLeadSource(v: unknown): v is (typeof LEAD_SOURCES)[number] {
  return typeof v === "string" && (LEAD_SOURCES as readonly string[]).includes(v);
}

export function isLeadPriority(v: unknown): v is (typeof LEAD_PRIORITIES)[number] {
  return typeof v === "string" && (LEAD_PRIORITIES as readonly string[]).includes(v);
}

export function isActivityType(v: unknown): v is (typeof ACTIVITY_TYPES)[number] {
  return typeof v === "string" && (ACTIVITY_TYPES as readonly string[]).includes(v);
}

export { timeAgo } from "@/lib/date-utils";

export { getInitials } from "@/lib/format-utils";
