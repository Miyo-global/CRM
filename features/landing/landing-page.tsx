"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  Zap,
  Target,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IconChip } from "@/components/ui/icon-chip";
import { features, stats } from "./landing-shared";
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
    desc: "Notifications as decisions happen, and dashboards that reflect them straight away.",
  },
  {
    icon: Target,
    title: "Role-based access",
    desc: "CEO, HR, managers and engineers each see what their role needs, and nothing else.",
  },
];

const dashboardPreview = [
  { label: "Employees present today", value: "47 / 52", pct: 90, color: "bg-success-500" },
  { label: "Active sprint progress", value: "18 / 24 tasks", pct: 75, color: "bg-info-500" },
  { label: "Leave requests waiting", value: "3 pending", pct: 25, color: "bg-gold-400" },
  { label: "Onboarding tasks done", value: "9 / 12", pct: 75, color: "bg-plum-500" },
];

export function LandingPage() {
  // Self-signup is off in this deployment, so "Get started" and "Start for
  // free" led to the sign-in page and promised something that does not exist
  // (QA-D006).
  const signupEnabled = isSignupEnabled();

  const heroRef = useRef(null);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-topbar w-full border-b border-sidebar-border bg-ink-950">
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

          <div className="container relative mx-auto px-4 lg:px-8 py-20 lg:py-32 text-center">
            <div
              className="max-w-4xl mx-auto"
            >
              <div>
                <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-sidebar-accent px-4 py-1.5">
                  <span className="size-1.5 rounded-full bg-gold-400" />
                  <span className="text-2xs font-semibold uppercase tracking-widest text-gold-300">
                    Internal workspace
                  </span>
                </div>
              </div>

              <h1
                className="mb-6 font-display text-4xl font-extrabold tracking-tight text-sidebar-accent-foreground sm:text-5xl"
              >
                One place for <span className="text-gold-400">HR</span>
                <br className="hidden sm:block" />
                {" "}and projects
              </h1>

              <p
                className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-sidebar-foreground sm:text-lg"
              >
                Payroll, attendance, leave and onboarding next to the sprints and tickets
                the work actually happens in.
              </p>

              <div
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
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-sidebar-border bg-ink-950 py-12">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="mb-1 font-display text-3xl font-extrabold tracking-tight text-gold-400">
                    {stat.value}
                  </p>
                  <p className="text-2xs font-medium uppercase tracking-wider text-sidebar-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="py-24 lg:py-32">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="text-center mb-16">
              <p className="mb-3 text-2xs font-semibold uppercase tracking-widest text-brand-text">Platform modules</p>
              <h2 className="mb-4 font-display text-3xl font-bold tracking-tight">Everything your team needs</h2>
              <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground">
                From recruitment to retirement, sprint to close — all in one cohesive workspace.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {features.map((feature) => (
                <div
                  key={feature.title}
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
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-surface-sunken py-24 lg:py-32">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-2 items-center">
              <div>
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
              </div>

              <div>
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
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2">
                    <CheckCircle2 className="size-4 text-success-strong" />
                    <span className="text-xs text-muted-foreground">All systems operational</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="brand-mark-bg relative overflow-hidden py-24 lg:py-32">
          <div className="container relative mx-auto px-4 lg:px-8 text-center max-w-3xl">
            <div>
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
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
