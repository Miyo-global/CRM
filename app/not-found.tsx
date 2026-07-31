"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NotFoundIllustration } from "@/components/illustrations";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";

function LayoutDashboard({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function HeadphonesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

export default function GlobalNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <motion.div
        className="flex flex-col items-center text-center"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >

        <motion.div variants={fadeUp} className="mb-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-9 h-9 bg-card rounded-lg border border-gold/20 flex items-center justify-center overflow-hidden shadow-sm">
              <Image
                src="/logo.svg"
                alt="Miyo Global Logo"
                width={30}
                height={30}
                className="rounded"
              />
            </div>
            <h1 className="text-xl font-bold font-serif text-foreground">
              Miyo Global
            </h1>
          </Link>
        </motion.div>

        <motion.div variants={fadeUp} className="mb-6">
          <NotFoundIllustration />
        </motion.div>

        <motion.div variants={fadeUp} className="max-w-md space-y-3">
          <h2 className="text-4xl font-bold text-foreground tracking-tight">
            Page Not Found
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed">
            The page you are looking for might have been removed, had its name
            changed, or is temporarily unavailable.
          </p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <Button
            asChild
            size="lg"
            className="min-w-[200px] shadow-lg shadow-primary/20"
          >
            <Link href="/dashboard">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            size="lg"
            className="min-w-[200px]"
          >
            <a href="mailto:support@miyoglobal.com">
              <HeadphonesIcon className="mr-2 h-4 w-4" />
              Contact Support
            </a>
          </Button>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="mt-16 pt-8 border-t border-border w-full max-w-2xl flex justify-center gap-8 text-xs text-muted-foreground font-medium"
        >
          <Link href="/" className="hover:text-primary transition-colors">
            System Status
          </Link>
          <Link href="/" className="hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <Link href="/" className="hover:text-primary transition-colors">
            Documentation
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
