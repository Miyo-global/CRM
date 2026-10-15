"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrbackgroundverificationError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load background verification"
      fallbackMessage="Something went wrong loading background verification. Try again."
    />
  );
}
