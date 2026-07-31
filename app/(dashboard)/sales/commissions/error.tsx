"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function SalescommissionsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Commissions Error"
      fallbackMessage="Failed to load Commissions. Please try again."
    />
  );
}
