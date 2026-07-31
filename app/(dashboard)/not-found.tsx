"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NotFoundIllustration } from "@/components/illustrations";
import { LayoutDashboard, HeadphonesIcon } from "lucide-react";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";

export default function DashboardNotFound() {
  return (
    <motion.div
      className="flex flex-1 flex-col items-center justify-center py-16 px-6 text-center min-h-[60vh]"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
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
        <Button asChild size="lg" className="min-w-[200px] shadow-lg shadow-primary/20">
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
          <Link href="/settings">
            <HeadphonesIcon className="mr-2 h-4 w-4" />
            Contact Support
          </Link>
        </Button>
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="mt-16 pt-8 border-t border-border w-full max-w-2xl flex justify-center gap-8 text-xs text-muted-foreground font-medium"
      >
        <Link
          href="/dashboard"
          className="hover:text-primary transition-colors"
        >
          System Status
        </Link>
        <Link
          href="/settings"
          className="hover:text-primary transition-colors"
        >
          Privacy Policy
        </Link>
        <Link
          href="/settings"
          className="hover:text-primary transition-colors"
        >
          Documentation
        </Link>
      </motion.div>
    </motion.div>
  );
}
