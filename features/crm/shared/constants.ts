import {
  Phone, Target, UserCheck, X, Zap, Eye,
  Share2, Megaphone, Globe, Footprints, Users, Flame, Sun, Snowflake,
} from "lucide-react";
import type React from "react";
import { CHART_VARS, toneVar } from "@/lib/design/tones";

export const PIPELINE_STAGES = [
  { key: "NEW", label: "New", dot: "bg-info-500", bg: "bg-info-soft", color: toneVar.info, icon: Zap },
  { key: "CONTACTED", label: "Contacted", dot: "bg-info-500", bg: "bg-info-soft", color: toneVar.teal, icon: Phone },
  { key: "INTERESTED", label: "Interested", dot: "bg-warning-500", bg: "bg-warning-soft", color: toneVar.warning, icon: Eye },
  { key: "QUALIFIED", label: "Qualified", dot: "bg-plum-500", bg: "bg-plum-soft", color: toneVar.plum, icon: Target },
  { key: "CONVERTED", label: "Converted", dot: "bg-success-500", bg: "bg-success-soft", color: toneVar.success, icon: UserCheck },
  { key: "LOST", label: "Lost", dot: "bg-danger-500", bg: "bg-danger-soft", color: toneVar.danger, icon: X },
] as const;

export const DEAL_STAGES = [
  { key: "LEAD", label: "Lead", dot: "bg-info-500", bg: "bg-info-soft" },
  { key: "CONTACTED", label: "Contacted", dot: "bg-info-500", bg: "bg-info-soft" },
  { key: "PROPOSAL", label: "Proposal", dot: "bg-warning-500", bg: "bg-warning-soft" },
  { key: "NEGOTIATION", label: "Negotiation", dot: "bg-plum-500", bg: "bg-plum-soft" },
  { key: "WON", label: "Won", dot: "bg-success-500", bg: "bg-success-soft" },
  { key: "LOST", label: "Lost", dot: "bg-danger-500", bg: "bg-danger-soft" },
] as const;

export type DealStage = (typeof DEAL_STAGES)[number]["key"];

export const LEAD_SOURCES = [
  { value: "referral", label: "Referral", icon: Share2 },
  { value: "campaign", label: "Campaign", icon: Megaphone },
  { value: "cold_call", label: "Cold Call", icon: Phone },
  { value: "website", label: "Website", icon: Globe },
  { value: "social_media", label: "Social Media", icon: Users },
  { value: "walk_in", label: "Walk-in", icon: Footprints },
  { value: "other", label: "Other", icon: Target },
] as const;

export const LEAD_PRIORITIES = [
  { value: "HOT", label: "Hot", color: "text-danger-strong", bg: "bg-danger-soft", border: "border-danger-strong/30", icon: Flame },
  { value: "WARM", label: "Warm", color: "text-warning-strong", bg: "bg-warning-soft", border: "border-warning-strong/30", icon: Sun },
  { value: "COLD", label: "Cold", color: "text-info-strong", bg: "bg-info-soft", border: "border-info-strong/30", icon: Snowflake },
] as const;

export const ACTIVITY_TYPES = [
  { value: "call", label: "Call", icon: Phone },
  { value: "email", label: "Email", icon: Target },
  { value: "whatsapp", label: "WhatsApp", icon: Phone },
  { value: "meeting", label: "Meeting", icon: Users },
  { value: "site_visit", label: "Site Visit", icon: Eye },
] as const;

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
