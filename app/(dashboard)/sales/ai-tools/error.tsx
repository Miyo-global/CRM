"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function AISalesToolsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="AI Sales Tools Error"
      fallbackMessage="Failed to load AI Sales Tools. Please try again."
    />
  );
}
