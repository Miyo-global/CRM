"use client";

import { motion, type Variants } from "framer-motion";
import { Users, LayoutGrid, TrendingUp, Calendar, MessageSquare, BarChart3 } from "lucide-react";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

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
    color: "from-amber-500/15 to-amber-600/5 border-amber-500/20",
    iconColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    tags: ["Payroll", "Attendance", "Leaves", "Recruitment"],
  },
  {
    icon: LayoutGrid,
    title: "Project Tracking",
    description:
      "Kanban boards, sprint planning, backlog management and velocity analytics. Keep every team aligned.",
    color: "from-blue-500/15 to-blue-600/5 border-blue-500/20",
    iconColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    tags: ["Kanban", "Sprints", "Analytics", "Epics"],
  },
  {
    icon: TrendingUp,
    title: "CRM & Sales",
    description:
      "Lead conversion tracking, deal pipeline, customer relationships and sales forecasting in one place.",
    color: "from-emerald-500/15 to-emerald-600/5 border-emerald-500/20",
    iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    tags: ["Leads", "Deals", "Pipeline", "Targets"],
  },
  {
    icon: Calendar,
    title: "Calendar & Scheduling",
    description:
      "Unified calendar for interviews, meetings, sprints, and events with Google Calendar integration.",
    color: "from-purple-500/15 to-purple-600/5 border-purple-500/20",
    iconColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    tags: ["Events", "Interviews", "Meetings"],
  },
  {
    icon: MessageSquare,
    title: "Real-time Chat",
    description:
      "Secure team messaging with DMs, group channels, file attachments, and mentions. Powered by Ably.",
    color: "from-rose-500/15 to-rose-600/5 border-rose-500/20",
    iconColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    tags: ["DMs", "Channels", "Files"],
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description:
      "Role-based dashboards, audit logs, and deep analytics across HR, CRM, and project performance.",
    color: "from-cyan-500/15 to-cyan-600/5 border-cyan-500/20",
    iconColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    tags: ["Dashboards", "Reports", "Audit"],
  },
];

export const stats = [
  { value: "10+", label: "Core modules" },
  { value: "360°", label: "Employee view" },
  { value: "Real-time", label: "Collaboration" },
  { value: "Secure", label: "End-to-end" },
];

export const testimonials = [
  {
    quote:
      "Miyo Global replaced 5 separate tools. Our HR, sales, and dev teams finally speak the same language.",
    name: "Arjun Mehta",
    role: "CTO, FinScale",
    rating: 5,
  },
  {
    quote:
      "The sprint + CRM combo is game-changing. We track leads and sprints in the same view now.",
    name: "Priya Sharma",
    role: "Head of Sales, BuildBridge",
    rating: 5,
  },
  {
    quote: "Payroll automation alone saved us 20+ hours per month. Setup was surprisingly easy.",
    name: "Rohit Das",
    role: "HR Director, TechNest",
    rating: 5,
  },
];
