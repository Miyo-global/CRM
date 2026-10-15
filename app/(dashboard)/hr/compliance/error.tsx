"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrcomplianceError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load compliance"
      fallbackMessage="Something went wrong loading compliance. Try again."
    />
  );
}
