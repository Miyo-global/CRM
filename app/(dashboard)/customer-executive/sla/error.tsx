"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function SlaError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="SLA Compliance Error"
      fallbackMessage="Failed to load SLA compliance data. Please try again."
    />
  );
}
