"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import { ExecutiveKpiWidget } from "@/components/dashboard/widgets/executive-kpi-widget";
import { ProjectHealthWidget } from "@/components/dashboard/widgets/project-health-widget";
import { AnnouncementsWidget } from "@/components/dashboard/widgets/announcements-widget";
import { UpcomingLeavesWidget } from "@/components/dashboard/widgets/upcoming-leaves-widget";
import { WidgetSkeleton } from "@/components/dashboard/widgets/widget-skeleton";
import { PublicDocumentsCard } from "@/features/dashboard/public-documents-card";
import { HrAdminRow } from "@/features/dashboard/hr-admin-row";
import {
  LeaveBalanceWidget,
  UpcomingHolidaysWidget,
  PendingRequestsWidget,
} from "@/features/dashboard/hr-widgets";
export function CeoAdminSection() {
  return (
    <>
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <Suspense fallback={<WidgetSkeleton rows={2} />}>
          <ExecutiveKpiWidget />
        </Suspense>
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
      >
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <AnnouncementsWidget />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton rows={2} />}>
          <ProjectHealthWidget />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <UpcomingLeavesWidget />
        </Suspense>
      </motion.div>

      <HrAdminRow />

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      >
        <LeaveBalanceWidget />
        <UpcomingHolidaysWidget />
        <PendingRequestsWidget />
      </motion.div>

      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <PublicDocumentsCard hideWhenEmpty />
      </motion.div>
    </>
  );
}
