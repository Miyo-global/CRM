"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function IncentivesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load incentives"
      fallbackMessage="Failed to load incentives."
    />
  );
}
