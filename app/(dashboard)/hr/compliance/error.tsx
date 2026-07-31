"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrcomplianceError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Compliance Error"
      fallbackMessage="Failed to load Compliance. Please try again."
    />
  );
}
