"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function AuthError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load authentication"
      fallbackMessage="Something went wrong. Please try again."
    />
  );
}
