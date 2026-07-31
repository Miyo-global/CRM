"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrbonusesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Bonuses Error"
      fallbackMessage="Failed to load Bonuses. Please try again."
    />
  );
}
