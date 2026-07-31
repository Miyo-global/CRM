"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrfnfError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Full & Final Error"
      fallbackMessage="Failed to load Full & Final. Please try again."
    />
  );
}
