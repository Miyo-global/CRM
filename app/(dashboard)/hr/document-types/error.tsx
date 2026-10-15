"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function DocumentTypesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load document types"
      fallbackMessage="Something went wrong loading document types configuration. Try again."
    />
  );
}
