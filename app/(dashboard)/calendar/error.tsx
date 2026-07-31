"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function CalendarError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Calendar error"
      fallbackMessage="Failed to load the calendar. Please try again."
    />
  );
}
