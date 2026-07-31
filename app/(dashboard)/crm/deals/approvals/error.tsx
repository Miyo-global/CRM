"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function CrmdealsapprovalsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Deal Approvals Error"
      fallbackMessage="Failed to load Deal Approvals. Please try again."
    />
  );
}
