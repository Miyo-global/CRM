"use client";

import Link from "next/link";
import { Suspense } from "react";
import { AnnouncementsWidget } from "@/components/dashboard/widgets/announcements-widget";
import { UpcomingLeavesWidget } from "@/components/dashboard/widgets/upcoming-leaves-widget";
import { LeaveBalanceWidget } from "@/components/dashboard/widgets/leave-balance-widget";
import { WidgetSkeleton } from "@/components/dashboard/widgets/widget-skeleton";
import { WidgetCard } from "@/components/dashboard/widgets/widget-card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ArrowRight } from "lucide-react";
import { HrAdminRow } from "@/features/dashboard/hr-admin-row";
import { SPAN } from "@/features/dashboard/bento";

/** HR/Admin bento items; rendered as direct children of the dashboard's 12-column grid. */
export function HrHomeSection() {
  return (
    <>
      <div className={SPAN.third}>
        <WidgetCard title="HR Dashboard" icon={LayoutDashboard} className="border-primary/40" contentClassName="flex flex-col justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Headcount, payroll, compliance, recruitment, and leave analytics live on the HR dashboard.
          </p>
          <Button asChild size="sm" className="w-fit">
            <Link href="/hr">
              Open HR Dashboard
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </WidgetCard>
      </div>
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

      <HrAdminRow />

      <div className={SPAN.third}>
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <LeaveBalanceWidget />
        </Suspense>
      </div>
    </>
  );
}
