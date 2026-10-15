"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrbonusesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load bonuses"
      fallbackMessage="Something went wrong loading bonuses. Try again."
    />
  );
}
