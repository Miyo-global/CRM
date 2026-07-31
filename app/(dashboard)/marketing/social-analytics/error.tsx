"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function SocialAnalyticsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Social Media Analytics Error"
      fallbackMessage="Failed to load social media analytics. Please try again."
    />
  );
}
