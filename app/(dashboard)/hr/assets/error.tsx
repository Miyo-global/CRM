"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrassetsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Assets Error"
      fallbackMessage="Failed to load Assets. Please try again."
    />
  );
}
