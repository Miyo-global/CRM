"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrtrainingError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load training"
      fallbackMessage="Something went wrong loading training. Try again."
    />
  );
}
