"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrenpsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="eNPS Error"
      fallbackMessage="Failed to load eNPS. Please try again."
    />
  );
}
