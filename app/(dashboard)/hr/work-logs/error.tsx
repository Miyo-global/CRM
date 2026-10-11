"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function WorkLogsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Failed to load Work Logs"
      fallbackMessage="An unexpected error occurred while loading work logs."
    />
  );
}
