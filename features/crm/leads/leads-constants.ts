import {
  Phone, Target, UserCheck, X, Zap, Eye,
} from "lucide-react";
import type React from "react";
import { toneSoft, toneText } from "@/lib/design/tones";

export const STATUSES = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"] as const;

export const LEAD_SOURCES = ["referral", "campaign", "cold_call", "website", "social_media", "walk_in", "other"] as const;

export const LEAD_PRIORITIES = ["HOT", "WARM", "COLD"] as const;

export const ACTIVITY_TYPES = ["call", "email", "whatsapp", "meeting", "site_visit"] as const;

// Pipeline: info → teal → plum → brand → success, LOST danger (same as
// lead-table/types.ts and detail/lead-types.ts). `border` is the kanban column /
// move-button outline, so it stays neutral rather than tinted.
export const STATUS_CONFIG: Record<
  (typeof STATUSES)[number],
  { label: string; color: string; bg: string; border: string; icon: React.ElementType }
> = {
  NEW: { label: "New", color: toneText.info, bg: "bg-info-soft", border: "border-border", icon: Zap },
  CONTACTED: { label: "Contacted", color: toneText.teal, bg: "bg-teal-soft", border: "border-border", icon: Phone },
  INTERESTED: { label: "Interested", color: toneText.plum, bg: "bg-plum-soft", border: "border-border", icon: Eye },
  QUALIFIED: { label: "Qualified", color: toneText.brand, bg: "bg-brand-soft", border: "border-border", icon: Target },
  CONVERTED: { label: "Converted", color: toneText.success, bg: "bg-success-soft", border: "border-border", icon: UserCheck },
  LOST: { label: "Lost", color: toneText.danger, bg: "bg-danger-soft", border: "border-border", icon: X },
};

// Lead source is free categorical → TAG_TONE_CYCLE order; `other` neutral.
export const SOURCE_COLORS: Record<string, string> = {
  referral: `${toneSoft.info} border-transparent`,
  campaign: `${toneSoft.teal} border-transparent`,
  cold_call: `${toneSoft.plum} border-transparent`,
  website: `${toneSoft.brand} border-transparent`,
  social_media: `${toneSoft.warning} border-transparent`,
  walk_in: `${toneSoft.success} border-transparent`,
  other: `${toneSoft.neutral} border-transparent`,
};

// Priority encodes HEAT (HOT = act now), so HOT keeps the danger tone.
export const PRIORITY_CONFIG = {
  HOT: `${toneSoft.danger} border-transparent`,
  WARM: `${toneSoft.warning} border-transparent`,
  COLD: `${toneSoft.info} border-transparent`,
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
