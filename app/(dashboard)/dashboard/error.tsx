"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function DashboardError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Dashboard Error"
      fallbackMessage="Failed to load the dashboard. Please try again."
    />
  );
}
