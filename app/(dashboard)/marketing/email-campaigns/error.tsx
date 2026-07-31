"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function MarketingemailcampaignsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Email Campaigns Error"
      fallbackMessage="Failed to load Email Campaigns. Please try again."
    />
  );
}
