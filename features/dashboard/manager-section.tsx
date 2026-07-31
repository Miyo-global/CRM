"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import { AnnouncementsWidget } from "@/components/dashboard/widgets/announcements-widget";
import { MyTasksWidget } from "@/components/dashboard/widgets/my-tasks-widget";
import { UpcomingLeavesWidget } from "@/components/dashboard/widgets/upcoming-leaves-widget";
import { QuickActionsWidget } from "@/components/dashboard/widgets/quick-actions-widget";
import { WidgetSkeleton } from "@/components/dashboard/widgets/widget-skeleton";
import { TeamAttendanceWidget as TeamAttendanceWidgetNew } from "@/components/dashboard/widgets/team-attendance-widget";
import { PendingApprovalsWidget as PendingApprovalsWidgetNew } from "@/components/dashboard/widgets/pending-approvals-widget";

export function ManagerSection() {
  return (
    <>
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
      >
        <Suspense fallback={<WidgetSkeleton rows={4} />}>
          <TeamAttendanceWidgetNew />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton rows={2} />}>
          <PendingApprovalsWidgetNew />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <MyTasksWidget />
        </Suspense>
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
      >
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <UpcomingLeavesWidget />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <AnnouncementsWidget />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <QuickActionsWidget />
        </Suspense>
      </motion.div>
    </>
  );
}
