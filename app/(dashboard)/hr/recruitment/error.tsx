"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function RecruitmentError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorBoundary {...props} title="Recruitment Error" fallbackMessage="Failed to load recruitment data." />;
}
