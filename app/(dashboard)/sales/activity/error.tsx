"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function SalesactivityError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Sales Activity Error"
      fallbackMessage="Failed to load Sales Activity. Please try again."
    />
  );
}
