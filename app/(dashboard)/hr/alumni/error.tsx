"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HralumniError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load alumni"
      fallbackMessage="Something went wrong loading alumni. Try again."
    />
  );
}
