"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function CeoError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load ceo dashboard"
      fallbackMessage="Something went wrong loading the ceo dashboard. Try again."
    />
  );
}
