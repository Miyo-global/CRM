"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function BacklogError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Backlog Error"
      fallbackMessage="Failed to load backlog."
    />
  );
}
