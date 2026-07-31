"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function CustomerExecutiveError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Customer Executive Error"
      fallbackMessage="Failed to load the customer executive dashboard. Please try again."
    />
  );
}
