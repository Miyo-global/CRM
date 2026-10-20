"use client";

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
    desc: "The Super Admin, admins and employees each see what their role needs, and nothing else.",
  },
];

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Why Miyo Global", href: "#why" },
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

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* QA-DES-02: the landing uses the same light tokens as sign-in and the
          app instead of a separate dark marketing theme. */}
      <header className="sticky top-0 z-topbar w-full border-b border-border bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="Miyo Global" width={28} height={28} className="size-7 shrink-0" />
            <span className="font-display text-base font-bold tracking-tight text-foreground">
              Miyo Global
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {/* QA-BUG-32: only anchors that land on a section of this page;
                there is no pricing section. */}
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-sm text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:focus-ring"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* R3-0028: one call to action in the header. With self-signup off
              both buttons read "Sign in", one beside the other. */}
          <div className="flex items-center gap-2">
            {signupEnabled && (
              <Button asChild variant="ghost" size="sm">
                <Link href="/signin">Sign in</Link>
              </Button>
            )}
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

        {/* QA-DES-02: a compact hero — headline, one line and one call to
            action above the fold, not a full-screen dark panel. */}
        <section className="border-b border-border">
          <div className="container mx-auto px-4 lg:px-8 py-14 lg:py-20 text-center">
            <div
              className="max-w-4xl mx-auto"
            >
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-sunken px-3 py-1">
                  <span className="size-1.5 rounded-full bg-primary" />
                  <span className="text-2xs font-semibold uppercase tracking-widest text-brand-text">
                    Internal workspace
                  </span>
                </div>
              </div>

              <h1
                className="mb-4 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl"
              >
                HR, Projects and Time for <span className="text-brand-text">Miyo Global</span>
              </h1>

              <p
                className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-muted-foreground"
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
                <Button asChild size="lg" variant="outline" className="px-8">
                  <a href="#features">
                    Explore features
                    <ChevronRight />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-surface-sunken py-8">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="mb-1 font-display text-2xl font-extrabold tracking-tight text-brand-text">
                    {stat.value}
                  </p>
                  <p className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-16 py-14 lg:py-20">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="text-center mb-10">
              <p className="mb-3 text-2xs font-semibold uppercase tracking-widest text-brand-text">Platform modules</p>
              <h2 className="mb-4 font-display text-3xl font-bold tracking-tight">Everything your team needs</h2>
              <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground">
                People, projects and time in one workspace, from a new hire&apos;s first day to the sprint they ship.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs transition-[border-color,box-shadow] duration-100 hover:border-border-strong hover:shadow-md"
                >
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

        <section id="why" className="scroll-mt-16 border-t border-border bg-surface-sunken py-14 lg:py-20">
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

      </main>

      <LandingFooter />
    </div>
  );
}
