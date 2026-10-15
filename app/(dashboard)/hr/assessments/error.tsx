"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrassessmentsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load assessments"
      fallbackMessage="Something went wrong loading assessments. Try again."
    />
  );
}
