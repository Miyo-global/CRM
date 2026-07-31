"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

function Users({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function TrendingUp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 7h6v6" />
      <path d="m22 7-8.5 8.5-5-5L2 17" />
    </svg>
  );
}

function LayoutGrid({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

const floatUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const SLIDES = [
  {
    icon: Users,
    accentColor: "amber",
    badge: "People & Org",
    title: "HR Management",
    subtitle: "Everything HR — from hire to retire, fully automated.",
    description:
      "Manage payroll, attendance tracking, leave policies, and recruitment pipelines in one unified workspace. Empower your HR team with real-time insights.",
    stats: [
      { value: "360°", label: "Employee view", color: "gold" as const },
      { value: "Auto", label: "Payroll runs", color: "blue" as const },
    ],
    features: [
      { label: "Payroll", active: true },
      { label: "Attendance" },
      { label: "Leaves" },
      { label: "Recruitment" },
      { label: "Performance" },
    ],
    highlight: "Automate monthly payroll with one click",
  },
  {
    icon: LayoutGrid,
    accentColor: "blue",
    badge: "Project OS",
    title: "Project Tracking",
    subtitle: "Sprints, kanban, backlog & epics — unified.",
    description:
      "Plan and execute projects with full visibility across sprints, cycles, and backlogs. Track velocity, burn-down, and team workload in real time.",
    stats: [
      { value: "∞", label: "Project cycles", color: "blue" as const },
      { value: "Live", label: "Burn-down", color: "green" as const },
    ],
    features: [
      { label: "Kanban", active: true },
      { label: "Sprints" },
      { label: "Analytics" },
      { label: "Epics" },
      { label: "Timeline" },
    ],
    highlight: "Ship faster with integrated sprint planning",
  },
  {
    icon: TrendingUp,
    accentColor: "purple",
    badge: "Revenue Engine",
    title: "CRM & Sales",
    subtitle: "Lead pipeline, deals, targets & forecasting.",
    description:
      "Track leads through every stage, manage client relationships, set revenue targets, and forecast sales with AI-powered insights — all in one view.",
    stats: [
      { value: "Real-time", label: "Pipeline view", color: "purple" as const },
      { value: "AI-ready", label: "Forecasting", color: "gold" as const },
    ],
    features: [
      { label: "Leads", active: true },
      { label: "Deals" },
      { label: "Targets" },
      { label: "Clients" },
      { label: "Reports" },
    ],
    highlight: "Close deals 40% faster with smart follow-ups",
  },
] as const;

const accentStyles = {
  amber: {
    icon: "bg-amber-500/15 border-amber-500/20",
    iconColor: "text-amber-400",
    badge: "border-amber-500/20 bg-amber-500/[0.08] text-amber-400",
    dot: "bg-amber-400",
    tag: "bg-amber-500/20 border-amber-500/30 text-amber-300",
    gradient: "from-amber-400 to-amber-600",
    orb: "bg-amber-500/[0.07]",
  },
  blue: {
    icon: "bg-blue-500/15 border-blue-500/20",
    iconColor: "text-blue-400",
    badge: "border-blue-500/20 bg-blue-500/[0.08] text-blue-400",
    dot: "bg-blue-400",
    tag: "bg-blue-500/20 border-blue-500/30 text-blue-300",
    gradient: "from-blue-400 to-blue-600",
    orb: "bg-blue-500/[0.07]",
  },
  purple: {
    icon: "bg-purple-500/15 border-purple-500/20",
    iconColor: "text-purple-400",
    badge: "border-purple-500/20 bg-purple-500/[0.08] text-purple-400",
    dot: "bg-purple-400",
    tag: "bg-purple-500/20 border-purple-500/30 text-purple-300",
    gradient: "from-purple-400 to-purple-600",
    orb: "bg-purple-500/[0.07]",
  },
};

const statColorMap = {
  gold: "from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400",
  blue: "from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400",
  green: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400",
  purple: "from-purple-500/20 to-purple-600/10 border-purple-500/20 text-purple-400",
};

const slideVariants: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1] },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -60 : 60,
    opacity: 0,
    transition: { duration: 0.3, ease: "easeIn" },
  }),
};

interface SlideIndicatorButtonProps {
  index: number;
  current: number;
  goTo: (idx: number) => void;
}

const SlideIndicatorButton = memo(function SlideIndicatorButton({
  index,
  current,
  goTo,
}: SlideIndicatorButtonProps) {
  const handleClick = useCallback(() => goTo(index), [index, goTo]);
  return (
    <button
      onClick={handleClick}
      aria-label={`Go to slide ${index + 1}`}
      className={cn(
        "h-1.5 rounded-full transition-all duration-300",
        index === current ? "w-6 bg-amber-400" : "w-1.5 bg-white/20 hover:bg-white/40"
      )}
    />
  );
});

export function AuthRightPanel() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);

  const handleMouseEnter = useCallback(() => setPaused(true), []);
  const handleMouseLeave = useCallback(() => setPaused(false), []);

  const goTo = useCallback((idx: number, dir?: number) => {
    setDirection(dir ?? (idx > current ? 1 : -1));
    setCurrent(idx);
  }, [current]);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((c) => (c + 1) % SLIDES.length);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [paused, next]);

  const slide = SLIDES[current];
  const accent = accentStyles[slide.accentColor];
  const Icon = slide.icon;

  return (
    <div
      className="relative h-full overflow-hidden bg-[#080a14] flex flex-col"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >

      <div className="absolute inset-0 pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className={`absolute top-[-10%] right-[-5%] h-[420px] w-[420px] rounded-full ${accent.orb} blur-[110px]`}
          />
        </AnimatePresence>
        <div className="absolute bottom-[10%] left-[-5%] h-[300px] w-[300px] rounded-full bg-blue-600/[0.05] blur-[80px]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(212,162,58,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,58,0.8) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <motion.div
        variants={floatUp}
        initial="hidden"
        animate="animate"
        className="relative z-10 px-8 pt-8 pb-0 shrink-0"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/[0.08] px-3 py-1 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[11px] font-medium text-amber-400 tracking-wide uppercase">
            All-in-one Platform
          </span>
        </div>
        <h2 className="text-[1.6rem] font-bold text-white leading-tight tracking-tight">
          Run your entire business
          <br />
          from{" "}
          <span
            className="bg-gradient-to-r from-amber-400 to-amber-600"
            style={{ WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
          >
            one place
          </span>
        </h2>
      </motion.div>

      <div className="relative z-10 flex-1 overflow-hidden px-8 py-5 min-h-0">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="h-full flex flex-col gap-5"
          >

            <div className={cn("inline-flex items-center gap-2 self-start rounded-full border px-3 py-1", accent.badge)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", accent.dot)} />
              <span className="text-[11px] font-medium tracking-wide uppercase">{slide.badge}</span>
            </div>

            <div className="flex items-start gap-4">
              <div className={cn("h-12 w-12 rounded-2xl border flex items-center justify-center shrink-0", accent.icon)}>
                <Icon className={cn("h-6 w-6", accent.iconColor)} />
              </div>
              <div>
                <p className="text-xl font-bold text-white leading-tight">{slide.title}</p>
                <p className="text-sm text-white/50 mt-0.5">{slide.subtitle}</p>
              </div>
            </div>

            <p className="text-[13px] text-white/40 leading-relaxed">{slide.description}</p>

            <div className="grid grid-cols-2 gap-2.5">
              {slide.stats.map((stat) => (
                <div
                  key={stat.label}
                  className={cn("rounded-xl bg-gradient-to-br border px-4 py-3", statColorMap[stat.color])}
                >
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-[10px] text-white/50 mt-0.5 uppercase tracking-wide">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {slide.features.map((f) => (
                <span
                  key={f.label}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-full border font-medium",
                    "active" in f && f.active ? accent.tag : "bg-white/[0.04] border-white/10 text-white/40"
                  )}
                >
                  {f.label}
                </span>
              ))}
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 flex items-center gap-3">
              <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", accent.dot)} />
              <p className="text-[12px] text-white/50 italic">{slide.highlight}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 px-8 pb-5 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <SlideIndicatorButton key={i} index={i} current={current} goTo={goTo} />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="h-7 w-7 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-white/50" />
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="h-7 w-7 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5 text-white/50" />
          </button>
        </div>
      </div>
    </div>
  );
}
