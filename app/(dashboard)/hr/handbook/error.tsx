"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrhandbookError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Handbook Error"
      fallbackMessage="Failed to load Handbook. Please try again."
    />
  );
}
