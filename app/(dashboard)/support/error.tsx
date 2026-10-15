"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function SupportError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load support"
      fallbackMessage="Something went wrong loading the support dashboard. Try again."
    />
  );
}
