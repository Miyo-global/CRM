"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { EmptyLeaveIllustration, EmptyCalendarIllustration } from "@/components/illustrations";

export function LeaveErrorState() {
  return (
    <EmptyState
      illustration={<EmptyCalendarIllustration />}
      title="Error loading leave data"
      description="Please try again or contact support if the issue persists."
    />
  );
}

export function NoLeaveRequestsState() {
  return (
    <EmptyState
      illustration={<EmptyLeaveIllustration />}
      title="No leave requests"
      description="You haven't submitted any leave requests yet."
    />
  );
}
