"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function SupportError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Support Error"
      fallbackMessage="Failed to load the support dashboard. Please try again."
    />
  );
}
