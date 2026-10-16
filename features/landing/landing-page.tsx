"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Star,
  CheckCircle2,
  Shield,
  Zap,
  Target,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconChip } from "@/components/ui/icon-chip";
import {
  fadeUp, stagger, scaleIn,
  SectionReveal, StaggerReveal,
  features, stats, testimonials,
} from "./landing-shared";
import { LandingFooter } from "./landing-footer";
import { isSignupEnabled } from "@/lib/auth/signup-enabled";

const whyPoints = [
  {
    icon: Shield,
    title: "Enterprise-grade security",
    desc: "MFA, audit logs, role-based permissions, and end-to-end encryption.",
  },
  {
    icon: Zap,
    title: "Real-time everything",
    desc: "Live chat, instant notifications, and WebSocket-powered updates.",
  },
  {
    icon: Target,
    title: "Role-based access",
    desc: "CEO, HR, Sales, Engineering — each role sees exactly what they need.",
  },
];

const dashboardPreview = [
  { label: "Employees present today", value: "47 / 52", pct: 90, color: "bg-success-500" },
  { label: "Active sprint progress", value: "18 / 24 tasks", pct: 75, color: "bg-info-500" },
  { label: "Pipeline conversion", value: "32%", pct: 32, color: "bg-gold-400" },
  { label: "Pending invoices", value: "₹4.2L", pct: 60, color: "bg-plum-500" },
];

export function LandingPage() {
  // Self-signup is off in this deployment, so "Get started" and "Start for
  // free" led to the sign-in page and promised something that does not exist
  // (QA-D006).
  const signupEnabled = isSignupEnabled();

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-topbar w-full border-b border-sidebar-border bg-ink-950/95 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="Miyo Global" width={28} height={28} className="size-7 shrink-0" />
            <span className="font-display text-base font-bold tracking-tight text-sidebar-accent-foreground">
              Miyo Global
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {["Features", "Solutions", "Pricing"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="rounded-sm text-sm font-medium text-sidebar-foreground outline-none transition-colors hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline-inverse" size="sm" className="border-transparent">
              <Link href="/signin">Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={signupEnabled ? "/signup" : "/signin"}>
                {signupEnabled ? "Get started" : "Sign in"}
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">

        <section ref={heroRef} className="brand-mark-bg relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 size-[640px] rounded-full bg-gold-400/5 ring-1 ring-gold-400/10" />

          <motion.div
            className="container relative mx-auto px-4 lg:px-8 py-20 lg:py-32 text-center"
            style={{ y: heroY, opacity: heroOpacity }}
          >
            <motion.div
              initial={false}
              animate="visible"
              variants={stagger}
              className="max-w-4xl mx-auto"
            >
              <motion.div variants={fadeUp}>
                <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-sidebar-accent px-4 py-1.5">
                  <span className="size-1.5 rounded-full bg-gold-400" />
                  <span className="text-2xs font-semibold uppercase tracking-widest text-gold-300">
                    Enterprise Platform v2.0
                  </span>
                </div>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="mb-6 font-display text-4xl font-extrabold tracking-tight text-sidebar-accent-foreground sm:text-5xl"
              >
                One platform for <span className="text-gold-400">HR</span>, Projects,
                <br className="hidden sm:block" />
                {" "}and Sales
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-sidebar-foreground sm:text-lg"
              >
                Streamline your enterprise with an all-in-one internal operating system.
                Manage your team, track projects, and grow revenue — from one unified workspace.
              </motion.p>

              <motion.div
                variants={fadeUp}
                className="flex flex-col sm:flex-row items-center justify-center gap-3"
              >
                <Button asChild size="lg" className="px-8">
                  <Link href={signupEnabled ? "/signup" : "/signin"}>
                    {signupEnabled ? "Start for free" : "Sign in to your account"}
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline-inverse" className="px-8">
                  <a href="#features">
                    Explore features
                    <ChevronRight />
                  </a>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        <section className="border-t border-sidebar-border bg-ink-950 py-12">
          <div className="container mx-auto px-4 lg:px-8">
            <StaggerReveal className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              {stats.map((stat) => (
                <motion.div key={stat.label} variants={fadeUp} className="text-center">
                  <p className="mb-1 font-display text-3xl font-extrabold tracking-tight text-gold-400">
                    {stat.value}
                  </p>
                  <p className="text-2xs font-medium uppercase tracking-wider text-sidebar-muted">{stat.label}</p>
                </motion.div>
              ))}
            </StaggerReveal>
          </div>
        </section>

        <section id="features" className="py-24 lg:py-32">
          <div className="container mx-auto px-4 lg:px-8">
            <SectionReveal className="text-center mb-16">
              <p className="mb-3 text-2xs font-semibold uppercase tracking-widest text-brand-text">Platform modules</p>
              <h2 className="mb-4 font-display text-3xl font-bold tracking-tight">Everything your team needs</h2>
              <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground">
                From recruitment to retirement, sprint to close — all in one cohesive workspace.
              </p>
            </SectionReveal>

            <StaggerReveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  variants={scaleIn}
                  className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs transition-[border-color,box-shadow] duration-100 hover:border-border-strong hover:shadow-md"
                >
                  <IconChip icon={feature.icon} tone={feature.tone} />
                  <div>
                    <h3 className="mb-1.5 font-display text-lg font-semibold">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {feature.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              ))}
            </StaggerReveal>
          </div>
        </section>

        <section className="border-y border-border bg-surface-sunken py-24 lg:py-32">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-2 items-center">
              <SectionReveal>
                <p className="mb-3 text-2xs font-semibold uppercase tracking-widest text-brand-text">Why teams choose Miyo Global</p>
                <h2 className="mb-6 font-display text-3xl font-bold leading-tight tracking-tight">
                  Built for teams that
                  <br />
                  move fast and scale
                </h2>
                <div className="space-y-4">
                  {whyPoints.map((item) => (
                    <div key={item.title} className="flex gap-4">
                      <IconChip icon={item.icon} className="mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionReveal>

              <SectionReveal delay={200}>
                <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="size-2 rounded-full bg-success-500 motion-safe:animate-pulse" />
                    <span className="text-xs font-medium text-muted-foreground">Live dashboard preview</span>
                  </div>
                  {dashboardPreview.map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-semibold tabular-nums">{item.value}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className={`h-full rounded-full ${item.color}`}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${item.pct}%` }}
                          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                          viewport={{ once: true }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2">
                    <CheckCircle2 className="size-4 text-success-strong" />
                    <span className="text-xs text-muted-foreground">All systems operational</span>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        <section className="py-24 lg:py-32">
          <div className="container mx-auto px-4 lg:px-8">
            <SectionReveal className="text-center mb-12">
              <p className="mb-3 text-2xs font-semibold uppercase tracking-widest text-brand-text">Testimonials</p>
              <h2 className="font-display text-3xl font-bold tracking-tight">Trusted by growing teams</h2>
            </SectionReveal>

            <StaggerReveal className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
              {testimonials.map((t) => (
                <motion.div
                  key={t.name}
                  variants={scaleIn}
                  className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs"
                >
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="size-3.5 fill-gold-400 text-gold-500" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </motion.div>
              ))}
            </StaggerReveal>
          </div>
        </section>

        <section className="brand-mark-bg relative overflow-hidden py-24 lg:py-32">
          <div className="container relative mx-auto px-4 lg:px-8 text-center max-w-3xl">
            <SectionReveal>
              <p className="mb-3 text-2xs font-semibold uppercase tracking-widest text-gold-400">Get started today</p>
              <h2 className="mb-5 font-display text-4xl font-extrabold leading-tight tracking-tight text-sidebar-accent-foreground">
                Ready to unify
                <br />
                your operations?
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-sidebar-foreground sm:text-lg">
                Join teams using Miyo Global to manage HR, track projects, and close deals — all from one place.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild size="lg" className="px-10">
                  <Link href={signupEnabled ? "/signup" : "/signin"}>
                    {signupEnabled ? "Start for free" : "Sign in to your account"}
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </SectionReveal>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
