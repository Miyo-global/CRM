"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrrecruitmentpipelineError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Recruitment Pipeline Error"
      fallbackMessage="Failed to load Recruitment Pipeline. Please try again."
    />
  );
}
