"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function TerminationError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Termination Module Error"
      fallbackMessage="Failed to load the termination management page. Please try again."
    />
  );
}
