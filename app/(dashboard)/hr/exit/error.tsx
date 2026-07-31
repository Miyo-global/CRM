"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrexitError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Exit Management Error"
      fallbackMessage="Failed to load Exit Management. Please try again."
    />
  );
}
