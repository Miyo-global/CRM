"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function AbTestingError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="A/B Testing Error"
      fallbackMessage="Failed to load A/B tests. Please try again."
    />
  );
}
