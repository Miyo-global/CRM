"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function GlobalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      layout="fullscreen"
      title="Something went wrong"
      fallbackMessage="An unexpected error occurred. Please try refreshing the page."
    />
  );
}
