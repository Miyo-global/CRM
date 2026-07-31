"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function UpsellTrackerError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Upsell Tracker Error"
      fallbackMessage="Failed to load the upsell tracker. Please try again."
    />
  );
}
