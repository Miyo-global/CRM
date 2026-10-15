"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrsurveysError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load surveys"
      fallbackMessage="Something went wrong loading surveys. Try again."
    />
  );
}
