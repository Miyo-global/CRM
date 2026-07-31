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
import {
  fadeUp, stagger, scaleIn,
  SectionReveal, StaggerReveal,
  features, stats, testimonials,
} from "./landing-shared";
import { LandingFooter } from "./landing-footer";

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
  { label: "Employees present today", value: "47 / 52", pct: 90, color: "bg-emerald-500" },
  { label: "Active sprint progress", value: "18 / 24 tasks", pct: 75, color: "bg-blue-500" },
  { label: "Pipeline conversion", value: "32%", pct: 32, color: "bg-amber-500" },
  { label: "Pending invoices", value: "₹4.2L", pct: 60, color: "bg-purple-500" },
];

export function LandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div
      className="flex min-h-screen flex-col bg-[#080a14] text-white"
      style={{ backgroundColor: "#080a14", color: "#fff" }}
    >
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#080a14]/95 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/25 flex items-center justify-center overflow-hidden">
              <Image src="/logo.svg" alt="Miyo Global" width={22} height={22} />
            </div>
            <span
              className="text-lg font-bold tracking-tight"
              style={{
                background: "linear-gradient(135deg, #d4a23a 0%, #f0c060 50%, #d4a23a 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Miyo Global
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {["Features", "Solutions", "Pricing"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm font-medium text-white/50 hover:text-white transition-colors duration-200"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/signin">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/60 hover:text-white hover:bg-white/5 border-0"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/signin">
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold border-0 shadow-lg shadow-amber-500/20"
              >
                Get Started
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">

        <section ref={heroRef} className="relative min-h-[calc(100vh-4rem)] flex items-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-15%] right-[5%] h-[600px] w-[600px] rounded-full bg-amber-500/[0.05] blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[5%] h-[500px] w-[500px] rounded-full bg-blue-600/[0.05] blur-[100px]" />
            <div className="absolute top-[30%] left-[40%] h-[300px] w-[300px] rounded-full bg-amber-400/[0.04] blur-[80px]" />
            <div
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(212,162,58,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,58,0.8) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />
          </div>

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
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/[0.08] px-4 py-1.5 mb-10">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-semibold text-amber-400 tracking-widest uppercase">
                    Enterprise Platform v2.0
                  </span>
                </div>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="mb-6 text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.06]"
              >
                One platform for{" "}
                <span style={{ background: "linear-gradient(135deg, #f0c060 0%, #d4a23a 50%, #b8860b 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  HR
                </span>
                ,{" "}
                <span style={{ background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #1d4ed8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Projects
                </span>
                ,
                <br className="hidden sm:block" />
                {" "}and{" "}
                <span style={{ background: "linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  Sales
                </span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mx-auto mb-10 max-w-2xl text-lg lg:text-xl text-white/40 leading-relaxed"
              >
                Streamline your enterprise with an all-in-one internal operating system.
                Manage your team, track projects, and grow revenue — from one unified workspace.
              </motion.p>

              <motion.div
                variants={fadeUp}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link href="/signin">
                  <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-black font-bold border-0 shadow-2xl shadow-amber-500/25 h-12 px-8 text-base">
                    Start for free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button size="lg" variant="outline" className="border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white hover:border-white/20 h-12 px-8 text-base">
                    Explore features
                    <ChevronRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </a>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        <section className="relative py-12 border-y border-white/[0.05] bg-white/[0.01]">
          <div className="container mx-auto px-4 lg:px-8">
            <StaggerReveal className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
              {stats.map((stat) => (
                <motion.div key={stat.label} variants={fadeUp} className="text-center">
                  <p
                    className="text-3xl lg:text-4xl font-extrabold tracking-tight mb-1"
                    style={{ background: "linear-gradient(135deg, #f0c060, #d4a23a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs text-white/35 font-medium tracking-wider uppercase">{stat.label}</p>
                </motion.div>
              ))}
            </StaggerReveal>
          </div>
        </section>

        <section id="features" className="py-24 lg:py-32">
          <div className="container mx-auto px-4 lg:px-8">
            <SectionReveal className="text-center mb-16">
              <p className="text-xs font-bold text-amber-400 tracking-widest uppercase mb-3">Platform modules</p>
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">Everything your team needs</h2>
              <p className="text-white/40 max-w-xl mx-auto text-lg leading-relaxed">
                From recruitment to retirement, sprint to close — all in one cohesive workspace.
              </p>
            </SectionReveal>

            <StaggerReveal className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  variants={scaleIn}
                  className={`group rounded-2xl border bg-gradient-to-br ${feature.color} p-6 space-y-4 transition-all duration-300 hover:scale-[1.01] cursor-default`}
                >
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${feature.iconColor}`}>
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white mb-1.5">{feature.title}</h3>
                    <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {feature.tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/50 font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </StaggerReveal>
          </div>
        </section>

        <section className="py-24 lg:py-32 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[20%] right-[10%] h-[350px] w-[350px] rounded-full bg-amber-500/[0.04] blur-[80px]" />
            <div className="absolute bottom-[10%] left-[10%] h-[300px] w-[300px] rounded-full bg-blue-600/[0.04] blur-[70px]" />
          </div>
          <div className="container mx-auto px-4 lg:px-8">
            <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-2 items-center">
              <SectionReveal>
                <p className="text-xs font-bold text-amber-400 tracking-widest uppercase mb-3">Why teams choose Miyo Global</p>
                <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-6 leading-tight">
                  Built for teams that
                  <br />
                  move fast and scale
                </h2>
                <div className="space-y-4">
                  {whyPoints.map((item) => (
                    <div key={item.title} className="flex gap-4">
                      <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                        <item.icon className="h-4 w-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white/90 text-sm">{item.title}</p>
                        <p className="text-sm text-white/40 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionReveal>

              <SectionReveal delay={200}>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-white/40 font-medium">Live dashboard preview</span>
                  </div>
                  {dashboardPreview.map((item) => (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-white/50">{item.label}</span>
                        <span className="text-white/80 font-semibold">{item.value}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
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
                  <div className="pt-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs text-white/40">All systems operational</span>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
        </section>

        <section className="py-24 lg:py-32 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/[0.02] to-transparent pointer-events-none" />
          <div className="container mx-auto px-4 lg:px-8">
            <SectionReveal className="text-center mb-12">
              <p className="text-xs font-bold text-amber-400 tracking-widest uppercase mb-3">Testimonials</p>
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">Trusted by growing teams</h2>
            </SectionReveal>

            <StaggerReveal className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
              {testimonials.map((t) => (
                <motion.div
                  key={t.name}
                  variants={scaleIn}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 space-y-4"
                >
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                  <div>
                    <p className="text-sm font-semibold text-white/90">{t.name}</p>
                    <p className="text-xs text-white/35">{t.role}</p>
                  </div>
                </motion.div>
              ))}
            </StaggerReveal>
          </div>
        </section>

        <section className="py-24 lg:py-32 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[10%] left-[50%] -translate-x-1/2 h-[400px] w-[600px] rounded-full bg-amber-500/[0.07] blur-[100px]" />
          </div>
          <div className="container relative mx-auto px-4 lg:px-8 text-center max-w-3xl">
            <SectionReveal>
              <p className="text-xs font-bold text-amber-400 tracking-widest uppercase mb-3">Get started today</p>
              <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-5 leading-tight">
                Ready to unify
                <br />
                your operations?
              </h2>
              <p className="text-white/40 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
                Join teams using Miyo Global to manage HR, track projects, and close deals — all from one place.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/signin">
                  <Button size="lg" className="bg-amber-500 hover:bg-amber-400 text-black font-bold border-0 shadow-2xl shadow-amber-500/25 h-12 px-10 text-base">
                    Start for free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </SectionReveal>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
