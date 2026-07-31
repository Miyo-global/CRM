"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrsurveysError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Surveys Error"
      fallbackMessage="Failed to load Surveys. Please try again."
    />
  );
}
