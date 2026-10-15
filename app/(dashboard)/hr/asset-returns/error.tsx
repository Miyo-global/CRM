"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrassetreturnsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load asset returns"
      fallbackMessage="Something went wrong loading asset returns. Try again."
    />
  );
}
