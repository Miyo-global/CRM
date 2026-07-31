"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrassetreturnsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Asset Returns Error"
      fallbackMessage="Failed to load Asset Returns. Please try again."
    />
  );
}
