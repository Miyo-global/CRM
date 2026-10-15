"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HranalyticsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load hr analytics"
      fallbackMessage="Something went wrong loading hr analytics. Try again."
    />
  );
}
