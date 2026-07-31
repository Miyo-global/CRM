"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function AIInsightsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="AI Campaign Insights Error"
      fallbackMessage="Failed to load the AI insights page. Please try again."
    />
  );
}
