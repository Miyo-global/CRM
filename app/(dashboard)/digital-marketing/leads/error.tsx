"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function MarketingLeadsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Marketing Leads Error"
      fallbackMessage="Failed to load marketing leads."
    />
  );
}
