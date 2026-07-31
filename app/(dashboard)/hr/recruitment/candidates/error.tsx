"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrrecruitmentcandidatesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Candidates Error"
      fallbackMessage="Failed to load Candidates. Please try again."
    />
  );
}
