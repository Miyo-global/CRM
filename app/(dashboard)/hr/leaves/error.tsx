"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function LeavesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load leaves"
      fallbackMessage="Something went wrong loading leaves data. Try again."
    />
  );
}
