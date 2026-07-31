"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrskillsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Skills Error"
      fallbackMessage="Failed to load Skills. Please try again."
    />
  );
}
