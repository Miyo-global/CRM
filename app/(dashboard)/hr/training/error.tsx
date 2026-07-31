"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrtrainingError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Training Error"
      fallbackMessage="Failed to load Training. Please try again."
    />
  );
}
