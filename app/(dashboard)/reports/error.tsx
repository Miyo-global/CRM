"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ReportsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load reports"
      fallbackMessage="Failed to load reports."
    />
  );
}
