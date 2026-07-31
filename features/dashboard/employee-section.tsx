"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import { AnnouncementsWidget } from "@/components/dashboard/widgets/announcements-widget";
import { MyTasksWidget } from "@/components/dashboard/widgets/my-tasks-widget";
import { TimesheetWidget } from "@/components/dashboard/widgets/timesheet-widget";
import { LeaveBalanceWidget as LeaveBalanceWidgetNew } from "@/components/dashboard/widgets/leave-balance-widget";
import { UpcomingLeavesWidget } from "@/components/dashboard/widgets/upcoming-leaves-widget";
import { QuickActionsWidget } from "@/components/dashboard/widgets/quick-actions-widget";
import { InformHrTodayWidget } from "@/components/dashboard/widgets/inform-hr-today-widget";
import { WidgetSkeleton } from "@/components/dashboard/widgets/widget-skeleton";

export function EmployeeSection() {
  return (
    <>
      <InformHrTodayWidget />

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
      >
        <Suspense fallback={<WidgetSkeleton rows={4} />}>
          <MyTasksWidget />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton rows={2} />}>
          <TimesheetWidget />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <LeaveBalanceWidgetNew />
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
