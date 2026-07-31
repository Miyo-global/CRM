"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function BillingError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Billing Error"
      fallbackMessage="Failed to load billing data. Please try again."
    />
  );
}
