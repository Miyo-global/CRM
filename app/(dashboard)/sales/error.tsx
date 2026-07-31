"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function SalesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Sales Error"
      fallbackMessage="Failed to load sales dashboard. Please try again."
    />
  );
}
