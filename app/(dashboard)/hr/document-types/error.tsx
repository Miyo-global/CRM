"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function DocumentTypesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Document Types Error"
      fallbackMessage="Failed to load document types configuration. Please try again."
    />
  );
}
