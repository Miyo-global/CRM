"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function LeadDistributionError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Lead Distribution Error"
      fallbackMessage="Failed to load lead distribution."
    />
  );
}
