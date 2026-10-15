"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrcareerladdersError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load career ladders"
      fallbackMessage="Something went wrong loading career ladders. Try again."
    />
  );
}
