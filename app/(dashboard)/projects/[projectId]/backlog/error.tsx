"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function BacklogError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load backlog"
      fallbackMessage="Failed to load backlog."
    />
  );
}
