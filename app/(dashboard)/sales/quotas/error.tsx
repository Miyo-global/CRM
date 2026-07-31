"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function SalesquotasError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Quotas Error"
      fallbackMessage="Failed to load Quotas. Please try again."
    />
  );
}
