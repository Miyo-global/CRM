"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import { WidgetSkeleton } from "@/components/dashboard/widgets/widget-skeleton";
import { TeamAttendanceWidget } from "@/features/dashboard/hr-widgets";
import { LeaveTodayCard } from "@/features/dashboard/leave-today-card";
import { BirthdaysCard } from "@/features/dashboard/birthdays-card";
import { PendingApprovalsCard } from "@/features/dashboard/pending-approvals-card";

export function HrAdminRow() {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
    >
      <LeaveTodayCard isAdmin />
      <BirthdaysCard />
      <PendingApprovalsCard />
      <Suspense fallback={<WidgetSkeleton rows={2} />}>
        <TeamAttendanceWidget />
      </Suspense>
    </motion.div>
  );
}
