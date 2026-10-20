"use client";

import { Suspense } from "react";
import { AnnouncementsWidget } from "@/components/dashboard/widgets/announcements-widget";
import { UpcomingLeavesWidget } from "@/components/dashboard/widgets/upcoming-leaves-widget";
import { LeaveBalanceWidget } from "@/components/dashboard/widgets/leave-balance-widget";
import { WidgetSkeleton } from "@/components/dashboard/widgets/widget-skeleton";
import { HrAdminRow } from "@/features/dashboard/hr-admin-row";
import { SPAN } from "@/features/dashboard/bento";

/**
 * HR/Admin bento items; rendered as direct children of the dashboard's 12-column grid.
 *
 * QA-DES-01: the "HR Dashboard" card was two lines and a button stretched to
 * the height of its neighbours, a tall mostly-empty panel. The sidebar and the
 * quick links already open /hr, so the first row is three working widgets.
 */
export function HrHomeSection() {
  return (
    <>
      <div className={SPAN.third}>
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <AnnouncementsWidget />
        </Suspense>
      </div>
      <div className={SPAN.third}>
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <UpcomingLeavesWidget />
        </Suspense>
      </div>
      <div className={SPAN.third}>
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <LeaveBalanceWidget />
        </Suspense>
      </div>

      <HrAdminRow />
    </>
  );
}
