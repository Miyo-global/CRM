"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function AccountSummaryError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Account Summary Error"
      fallbackMessage="Failed to load the Account Summary Generator. Please try again."
    />
  );
}
