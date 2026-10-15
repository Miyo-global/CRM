"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrrecognitionError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load recognition"
      fallbackMessage="Something went wrong loading recognition. Try again."
    />
  );
}
