"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function TerminationError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load termination module"
      fallbackMessage="Something went wrong loading the termination management page. Try again."
    />
  );
}
