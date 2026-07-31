"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ReportNarratorError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Report Narrator Error"
      fallbackMessage="Failed to load the Report Narrator. Please try again."
    />
  );
}
