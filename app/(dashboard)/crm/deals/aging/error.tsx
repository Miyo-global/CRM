"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function CrmdealsagingError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Deal Aging Report Error"
      fallbackMessage="Failed to load Deal Aging Report. Please try again."
    />
  );
}
