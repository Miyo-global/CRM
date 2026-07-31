"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function CRMError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="CRM Error"
      fallbackMessage="Failed to load CRM data. Please try again."
    />
  );
}
