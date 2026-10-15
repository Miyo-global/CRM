"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function DocumentReviewError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load document review"
      fallbackMessage="Something went wrong loading the document review dashboard. Try again."
    />
  );
}
