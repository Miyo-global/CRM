"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrhandbookError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load handbook"
      fallbackMessage="Something went wrong loading handbook. Try again."
    />
  );
}
