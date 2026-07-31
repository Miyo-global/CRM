"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function SalesPlaybookError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorBoundary error={error} reset={reset} />;
}
