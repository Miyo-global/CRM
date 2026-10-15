"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrloansError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load loans"
      fallbackMessage="Something went wrong loading loans. Try again."
    />
  );
}
