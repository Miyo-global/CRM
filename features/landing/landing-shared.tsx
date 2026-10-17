"use client";

import { motion, type Variants } from "framer-motion";
import { Users, LayoutGrid, TrendingUp, Calendar, MessageSquare, BarChart3 } from "lucide-react";
import type { Tone } from "@/lib/design/tones";

// R3-D001: the landing page no longer fades, scales or staggers itself in.
// The names stay for the call sites; every state is the same.
const STATIC: Variants = { hidden: {}, visible: {} };

export const fadeUp = STATIC;
export const stagger = STATIC;
export const scaleIn = STATIC;

export function SectionReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={false}
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px" }}
      variants={fadeUp}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerReveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={stagger}
      initial={false}
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px" }}
    >
      {children}
    </motion.div>
  );
}

export const features = [
  {
    icon: Users,
    title: "HR Management",
    description:
      "Automate payroll, attendance, leave management, and recruitment. Complete employee lifecycle from hire to retire.",
    tone: "brand" as Tone,
    tags: ["Payroll", "Attendance", "Leaves", "Recruitment"],
  },
  {
    icon: LayoutGrid,
    title: "Project Tracking",
    description:
      "Kanban boards, sprint planning, backlog management and velocity analytics. Keep every team aligned.",
    tone: "info" as Tone,
    tags: ["Kanban", "Sprints", "Analytics", "Epics"],
  },
  {
    icon: TrendingUp,
    title: "CRM & Sales",
    description:
      "Lead conversion tracking, deal pipeline, customer relationships and sales forecasting in one place.",
    tone: "success" as Tone,
    tags: ["Leads", "Deals", "Pipeline", "Targets"],
  },
  {
    icon: Calendar,
    title: "Calendar & Scheduling",
    description:
      "Unified calendar for interviews, meetings, sprints, and events with Google Calendar integration.",
    tone: "plum" as Tone,
    tags: ["Events", "Interviews", "Meetings"],
  },
  {
    icon: MessageSquare,
    title: "Real-time Chat",
    description:
      "Secure team messaging with DMs, group channels, file attachments, and mentions. Powered by Ably.",
    tone: "neutral" as Tone,
    tags: ["DMs", "Channels", "Files"],
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description:
      "Role-based dashboards, audit logs, and deep analytics across HR, CRM, and project performance.",
    tone: "teal" as Tone,
    tags: ["Dashboards", "Reports", "Audit"],
  },
];

export const stats = [
  { value: "10+", label: "Core modules" },
  { value: "360°", label: "Employee view" },
  { value: "Real-time", label: "Collaboration" },
  { value: "Secure", label: "End-to-end" },
];

