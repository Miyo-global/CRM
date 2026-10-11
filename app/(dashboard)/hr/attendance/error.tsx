"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function AttendanceError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Failed to load Attendance"
      fallbackMessage="An unexpected error occurred while loading attendance data."
    />
  );
}
