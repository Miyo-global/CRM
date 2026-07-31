"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function CustomFieldsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Custom Fields Error"
      fallbackMessage="Failed to load Custom Fields settings. Please try again."
    />
  );
}
