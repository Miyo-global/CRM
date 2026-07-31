"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function CsatSurveysError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="CSAT Surveys Error"
      fallbackMessage="Failed to load CSAT surveys. Please try again."
    />
  );
}
