"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrassetsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load assets"
      fallbackMessage="Something went wrong loading assets. Try again."
    />
  );
}
