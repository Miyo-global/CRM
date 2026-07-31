"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function CampaignsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Campaigns Error"
      fallbackMessage="Failed to load campaigns."
    />
  );
}
