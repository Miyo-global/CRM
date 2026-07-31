"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HremailtemplatesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Email Templates Error"
      fallbackMessage="Failed to load Email Templates. Please try again."
    />
  );
}
