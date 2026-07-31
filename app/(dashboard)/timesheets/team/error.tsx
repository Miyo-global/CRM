"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function TeamTimesheetsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Team Timesheets Error"
      fallbackMessage="Failed to load team timesheets."
    />
  );
}
