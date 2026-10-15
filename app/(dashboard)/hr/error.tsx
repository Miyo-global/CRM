"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HRError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load hr module"
      fallbackMessage="Something went wrong loading the hr module. Try again."
    />
  );
}
