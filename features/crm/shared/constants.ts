import {
  Phone, Target, UserCheck, X, Zap, Eye,
  Share2, Megaphone, Globe, Footprints, Users, Flame, Sun, Snowflake,
} from "lucide-react";
import type React from "react";

export const PIPELINE_STAGES = [
  { key: "NEW", label: "New", dot: "bg-blue-500", bg: "bg-blue-500/10", color: "#3B82F6", icon: Zap },
  { key: "CONTACTED", label: "Contacted", dot: "bg-sky-500", bg: "bg-sky-500/10", color: "#0EA5E9", icon: Phone },
  { key: "INTERESTED", label: "Interested", dot: "bg-amber-500", bg: "bg-amber-500/10", color: "#F59E0B", icon: Eye },
  { key: "QUALIFIED", label: "Qualified", dot: "bg-purple-500", bg: "bg-purple-500/10", color: "#8B5CF6", icon: Target },
  { key: "CONVERTED", label: "Converted", dot: "bg-emerald-500", bg: "bg-emerald-500/10", color: "#10B981", icon: UserCheck },
  { key: "LOST", label: "Lost", dot: "bg-red-500", bg: "bg-red-500/10", color: "#EF4444", icon: X },
] as const;

export const DEAL_STAGES = [
  { key: "LEAD", label: "Lead", dot: "bg-blue-500", bg: "bg-blue-500/10" },
  { key: "CONTACTED", label: "Contacted", dot: "bg-sky-500", bg: "bg-sky-500/10" },
  { key: "PROPOSAL", label: "Proposal", dot: "bg-amber-500", bg: "bg-amber-500/10" },
  { key: "NEGOTIATION", label: "Negotiation", dot: "bg-purple-500", bg: "bg-purple-500/10" },
  { key: "WON", label: "Won", dot: "bg-emerald-500", bg: "bg-emerald-500/10" },
  { key: "LOST", label: "Lost", dot: "bg-red-500", bg: "bg-red-500/10" },
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
  { value: "HOT", label: "Hot", color: "text-red-700 dark:text-red-400", bg: "bg-red-500/15", border: "border-red-500/30", icon: Flame },
  { value: "WARM", label: "Warm", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/30", icon: Sun },
  { value: "COLD", label: "Cold", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-400/15", border: "border-blue-400/30", icon: Snowflake },
] as const;

export const ACTIVITY_TYPES = [
  { value: "call", label: "Call", icon: Phone },
  { value: "email", label: "Email", icon: Target },
  { value: "whatsapp", label: "WhatsApp", icon: Phone },
  { value: "meeting", label: "Meeting", icon: Users },
  { value: "site_visit", label: "Site Visit", icon: Eye },
] as const;

export const CHART_COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444", "#0EA5E9", "#EC4899", "#6366F1"];

export const CHART_TOOLTIP_STYLE = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
} as const;

export const AXIS_TICK = { fill: "hsl(var(--muted-foreground))", fontSize: 11 } as const;
