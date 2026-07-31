"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrlearningpathsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Learning Paths Error"
      fallbackMessage="Failed to load Learning Paths. Please try again."
    />
  );
}
