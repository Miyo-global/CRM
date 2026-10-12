"use client";

import { Suspense } from "react";
import { WidgetSkeleton } from "@/components/dashboard/widgets/widget-skeleton";
import { TeamAttendanceWidget } from "@/features/dashboard/hr-widgets";
import { LeaveTodayCard } from "@/features/dashboard/leave-today-card";
import { BirthdaysCard } from "@/features/dashboard/birthdays-card";
import { PendingApprovalsCard } from "@/features/dashboard/pending-approvals-card";
import { SPAN } from "@/features/dashboard/bento";

/** Four quarter-width HR widgets; rendered as direct children of the dashboard's 12-column grid. */
export function HrAdminRow() {
  return (
    <>
      <div className={SPAN.quarter}>
        <LeaveTodayCard isAdmin />
      </div>
      <div className={SPAN.quarter}>
        <BirthdaysCard />
      </div>
      <div className={SPAN.quarter}>
        <PendingApprovalsCard />
      </div>
      <div className={SPAN.quarter}>
        <Suspense fallback={<WidgetSkeleton rows={2} />}>
          <TeamAttendanceWidget />
        </Suspense>
      </div>
    </>
  );
}
