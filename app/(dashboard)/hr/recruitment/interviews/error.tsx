"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrrecruitmentinterviewsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Interviews Error"
      fallbackMessage="Failed to load Interviews. Please try again."
    />
  );
}
