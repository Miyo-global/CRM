"use client";

import Link from "next/link";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import { AnnouncementsWidget } from "@/components/dashboard/widgets/announcements-widget";
import { UpcomingLeavesWidget } from "@/components/dashboard/widgets/upcoming-leaves-widget";
import { LeaveBalanceWidget } from "@/components/dashboard/widgets/leave-balance-widget";
import { WidgetSkeleton } from "@/components/dashboard/widgets/widget-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ArrowRight } from "lucide-react";
import { HrAdminRow } from "@/features/dashboard/hr-admin-row";

export function HrHomeSection() {
  return (
    <>
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
      >
        <Card className="h-full flex flex-col border-gold/20 bg-gold/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 text-gold" aria-hidden="true" />
              HR Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Headcount, payroll, compliance, recruitment, and leave analytics live on the HR dashboard.
            </p>
            <Button asChild size="sm" className="w-fit">
              <Link href="/hr">
                Open HR Dashboard
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <AnnouncementsWidget />
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
        className="grid gap-4 grid-cols-1 md:grid-cols-2 max-w-md"
      >
        <Suspense fallback={<WidgetSkeleton rows={3} />}>
          <LeaveBalanceWidget />
        </Suspense>
      </motion.div>
    </>
  );
}
