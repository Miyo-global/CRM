"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function RenewalPipelineError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Renewal Pipeline Error"
      fallbackMessage="Failed to load the renewal pipeline. Please try again."
    />
  );
}
