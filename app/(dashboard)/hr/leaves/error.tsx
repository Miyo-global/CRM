"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function LeavesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Leaves Error"
      fallbackMessage="Failed to load leaves data. Please try again."
    />
  );
}
