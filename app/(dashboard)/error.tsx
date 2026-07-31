"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function DashboardError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Something went wrong"
      fallbackMessage="An unexpected error occurred. Please try again or contact support."
    />
  );
}
