"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function DocumentReviewError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Document Review Error"
      fallbackMessage="Failed to load the document review dashboard. Please try again."
    />
  );
}
