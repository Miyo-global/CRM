"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrrecruitmentjobsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Jobs Error"
      fallbackMessage="Failed to load Jobs. Please try again."
    />
  );
}
