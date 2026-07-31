"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function LandingPagesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Landing Pages Error"
      fallbackMessage="Failed to load Landing Pages. Please try again."
    />
  );
}
