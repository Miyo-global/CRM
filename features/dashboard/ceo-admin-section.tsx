"use client";

import { Suspense } from "react";
import { ExecutiveKpiWidget } from "@/components/dashboard/widgets/executive-kpi-widget";
import { ProjectHealthWidget } from "@/components/dashboard/widgets/project-health-widget";
import { AnnouncementsWidget } from "@/components/dashboard/widgets/announcements-widget";
import { UpcomingLeavesWidget } from "@/components/dashboard/widgets/upcoming-leaves-widget";
import { WidgetSkeleton } from "@/components/dashboard/widgets/widget-skeleton";
import { PublicDocumentsCard } from "@/features/dashboard/public-documents-card";
import { HrAdminRow } from "@/features/dashboard/hr-admin-row";
import { SPAN } from "@/features/dashboard/bento";
import {
  LeaveBalanceWidget,
  UpcomingHolidaysWidget,
  PendingRequestsWidget,
} from "@/features/dashboard/hr-widgets";

/** CEO bento items; rendered as direct children of the dashboard's 12-column grid. */
export function CeoAdminSection() {
  return (
    <>
      <div className={SPAN.full}>
        <Suspense fallback={<WidgetSkeleton rows={2} />}>
          <ExecutiveKpiWidget />
        </Suspense>
      </div>

      <div className={SPAN.third}>
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <AnnouncementsWidget />
        </Suspense>
      </div>
      <div className={SPAN.third}>
        <Suspense fallback={<WidgetSkeleton rows={2} />}>
          <ProjectHealthWidget />
        </Suspense>
      </div>
      <div className={SPAN.third}>
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <UpcomingLeavesWidget />
        </Suspense>
      </div>

      <HrAdminRow />

      <div className={SPAN.third}>
        <LeaveBalanceWidget />
      </div>
      <div className={SPAN.third}>
        <UpcomingHolidaysWidget />
      </div>
      <div className={SPAN.third}>
        <PendingRequestsWidget />
      </div>

      <PublicDocumentsCard hideWhenEmpty className={SPAN.full} />
    </>
  );
}
