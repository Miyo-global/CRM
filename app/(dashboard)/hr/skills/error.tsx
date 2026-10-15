"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrskillsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load skills"
      fallbackMessage="Something went wrong loading skills. Try again."
    />
  );
}
