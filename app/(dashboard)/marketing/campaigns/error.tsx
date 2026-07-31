"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function MarketingcampaignsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Marketing Campaigns Error"
      fallbackMessage="Failed to load Marketing Campaigns. Please try again."
    />
  );
}
