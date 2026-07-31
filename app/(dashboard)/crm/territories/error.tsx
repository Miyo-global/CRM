"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function TerritoriesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Territory Management Error"
      fallbackMessage="Failed to load territories. Please try again."
    />
  );
}
