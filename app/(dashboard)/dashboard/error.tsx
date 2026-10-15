"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function DashboardError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load dashboard"
      fallbackMessage="Something went wrong loading the dashboard. Try again."
    />
  );
}
