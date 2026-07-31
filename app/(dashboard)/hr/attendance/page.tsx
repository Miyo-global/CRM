"use client";

import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AttendanceContent } from "./attendance-content";
import { Skeleton } from "@/components/ui/skeleton";
import { hasLeaveApproverRole } from "@/lib/auth/leave-approval-roles";
import { isAdminOrOwner } from "@/lib/constants/roles";
import { AttendanceExportSheet } from "@/features/hr/attendance/attendance-export-sheet";

export default function AttendancePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <PageWrapper title="Attendance" subtitle="Track your work hours and manage check-ins">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 space-y-4">
            <Skeleton className="h-64" />
            <Skeleton className="h-40" />
          </div>
          <div className="lg:col-span-8 space-y-4">
            <Skeleton className="h-72" />
            <Skeleton className="h-56" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  const userId = session?.user?.id;
  if (!userId) return null;
  const isAdmin = hasLeaveApproverRole(session?.user?.role);
  const canExport = isAdminOrOwner(session?.user?.role);

  return (
    <PageWrapper
      title="Attendance"
      subtitle="Track your work hours and manage check-ins"
      noInternalScroll
      contentClassName="flex flex-col"
      actions={canExport ? <AttendanceExportSheet /> : undefined}
    >
      <AttendanceContent userId={userId} isAdmin={isAdmin} />
    </PageWrapper>
  );
}
