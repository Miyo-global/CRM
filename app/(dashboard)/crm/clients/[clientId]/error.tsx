"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ClientDetailsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Client Details Error"
      fallbackMessage="Failed to load client details."
    />
  );
}
