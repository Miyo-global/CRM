"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrenpsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load enps"
      fallbackMessage="Something went wrong loading enps. Try again."
    />
  );
}
