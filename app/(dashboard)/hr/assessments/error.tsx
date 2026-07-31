"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrassessmentsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Assessments Error"
      fallbackMessage="Failed to load Assessments. Please try again."
    />
  );
}
