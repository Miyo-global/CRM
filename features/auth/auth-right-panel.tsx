"use client";

import { useState, useEffect, useCallback, memo } from "react";
import Image from "next/image";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ChevronLeft, ChevronRight, LayoutGrid, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    icon: Users,
    badge: "People & Org",
    title: "HR Management",
    subtitle: "Everything HR — from hire to retire, fully automated.",
    description:
      "Manage payroll, attendance tracking, leave policies, and recruitment pipelines in one unified workspace. Empower your HR team with real-time insights.",
    stats: [
      { value: "360°", label: "Employee view" },
      { value: "Auto", label: "Payroll runs" },
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
    badge: "Project OS",
    title: "Project Tracking",
    subtitle: "Sprints, kanban, backlog & epics — unified.",
    description:
      "Plan and execute projects with full visibility across sprints, cycles, and backlogs. Track velocity, burn-down, and team workload in real time.",
    stats: [
      { value: "∞", label: "Project cycles" },
      { value: "Live", label: "Burn-down" },
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
    badge: "Revenue Engine",
    title: "CRM & Sales",
    subtitle: "Lead pipeline, deals, targets & forecasting.",
    description:
      "Track leads through every stage, manage client relationships, set revenue targets, and forecast sales with AI-powered insights — all in one view.",
    stats: [
      { value: "Real-time", label: "Pipeline view" },
      { value: "AI-ready", label: "Forecasting" },
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

const slideVariants: Variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 24 : -24, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] } },
  exit: (dir: number) => ({
    x: dir > 0 ? -24 : 24,
    opacity: 0,
    transition: { duration: 0.18, ease: [0.65, 0, 0.35, 1] },
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
      aria-current={index === current || undefined}
      className={cn(
        "h-1.5 rounded-full outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        index === current ? "w-6 bg-gold-400" : "w-1.5 bg-sidebar-border hover:bg-sidebar-muted"
      )}
    />
  );
});

const navButtonClass =
  "flex size-8 items-center justify-center rounded-full border border-sidebar-border text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring";

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

  return (
    <div
      className="brand-mark-bg relative flex h-full w-full flex-col overflow-hidden px-12 py-10"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Logo circle motif, partially off-canvas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-48 -bottom-48 size-140 rounded-full bg-gold-400 opacity-8"
      />

      <div className="relative">
        <Image
          src="/logo-wordmark.png"
          alt="Miyo Global"
          width={160}
          height={160}
          className="h-auto w-40"
        />
      </div>

      <div className="relative mt-10">
        <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-sidebar-accent-foreground">
          Run your entire business
          <br />
          from <span className="text-gold-400">one place</span>
        </h2>
        <p className="mt-3 text-2xs font-semibold uppercase tracking-widest text-sidebar-muted">
          All-in-one Platform
        </p>
      </div>

      <ul className="relative mt-8 space-y-4">
        {SLIDES.map((s, i) => {
          const Icon = s.icon;
          const active = i === current;
          return (
            <li key={s.title} className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                  active ? "bg-gold-400 text-ink-950" : "bg-gold-400/15 text-gold-400"
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p
                  className={cn(
                    "text-sm font-semibold transition-colors",
                    active ? "text-sidebar-accent-foreground" : "text-sidebar-foreground"
                  )}
                >
                  {s.title}
                </p>
                <p className="text-xs text-sidebar-muted">{s.subtitle}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="relative mt-auto pt-8">
        <div className="min-h-64 overflow-hidden rounded-xl border border-sidebar-border bg-sidebar-accent p-5">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col gap-4"
            >
              <span className="inline-flex items-center gap-2 self-start text-2xs font-semibold uppercase tracking-widest text-gold-400">
                <span className="size-1.5 rounded-full bg-gold-400" aria-hidden="true" />
                {slide.badge}
              </span>

              <p className="text-sm leading-relaxed text-sidebar-foreground">{slide.description}</p>

              <div className="grid grid-cols-2 gap-2.5">
                {slide.stats.map((stat) => (
                  <div key={stat.label} className="rounded-lg border border-sidebar-border px-4 py-3">
                    <p className="font-display text-xl font-bold text-sidebar-accent-foreground">
                      {stat.value}
                    </p>
                    <p className="mt-0.5 text-2xs uppercase tracking-wide text-sidebar-muted">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {slide.features.map((f) => (
                  <span
                    key={f.label}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-2xs font-medium",
                      "active" in f && f.active
                        ? "border-gold-400/40 text-gold-400"
                        : "border-sidebar-border text-sidebar-muted"
                    )}
                  >
                    {f.label}
                  </span>
                ))}
              </div>

              <p className="border-l-2 border-gold-400 pl-3 text-xs italic text-sidebar-foreground">
                {slide.highlight}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {SLIDES.map((_, i) => (
              <SlideIndicatorButton key={i} index={i} current={current} goTo={goTo} />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={prev} aria-label="Previous slide" className={navButtonClass}>
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button onClick={next} aria-label="Next slide" className={navButtonClass}>
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
