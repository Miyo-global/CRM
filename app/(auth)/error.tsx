"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function AuthError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Authentication Error"
      fallbackMessage="Something went wrong. Please try again."
    />
  );
}
