"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrcareerladdersError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Career Ladders Error"
      fallbackMessage="Failed to load Career Ladders. Please try again."
    />
  );
}
