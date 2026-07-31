"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function MarketingError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Marketing Error"
      fallbackMessage="Failed to load the marketing dashboard. Please try again."
    />
  );
}
