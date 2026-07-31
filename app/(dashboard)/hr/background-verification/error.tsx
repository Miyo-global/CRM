"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrbackgroundverificationError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Background Verification Error"
      fallbackMessage="Failed to load Background Verification. Please try again."
    />
  );
}
