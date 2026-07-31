"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HRError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="HR Module Error"
      fallbackMessage="Failed to load the HR module. Please try again."
    />
  );
}
