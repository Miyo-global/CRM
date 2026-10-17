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
    title: "Performance",
    description:
      "Appraisal cycles, goals, reviews and improvement plans, with the history behind each decision.",
    tone: "success" as Tone,
    tags: ["Appraisals", "Goals", "Reviews", "PIP"],
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
    title: "Support desk",
    description:
      "Internal tickets with assignment, replies and status, so a question to HR or IT does not sit in an inbox.",
    tone: "neutral" as Tone,
    tags: ["Tickets", "Replies", "Status"],
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description:
      "Role-based dashboards, audit logs and reports across attendance, payroll and project delivery.",
    tone: "teal" as Tone,
    tags: ["Dashboards", "Reports", "Audit"],
  },
];

// MIYO-0311: figures a reader can check, not "360°" and "Real-time".
export const stats = [
  { value: "Payroll", label: "Monthly, with payslips" },
  { value: "Attendance", label: "Daily, with leave" },
  { value: "Projects", label: "Sprints and tickets" },
  { value: "MFA", label: "On every account" },
];

