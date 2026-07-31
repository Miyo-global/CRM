"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrrecognitionError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Recognition Error"
      fallbackMessage="Failed to load Recognition. Please try again."
    />
  );
}
