"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrlearningpathsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load learning paths"
      fallbackMessage="Something went wrong loading learning paths. Try again."
    />
  );
}
