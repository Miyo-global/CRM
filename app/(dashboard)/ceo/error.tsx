"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function CeoError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="CEO Dashboard Error"
      fallbackMessage="Failed to load the CEO dashboard. Please try again."
    />
  );
}
