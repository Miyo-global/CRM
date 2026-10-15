"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function SprintsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load sprints"
      fallbackMessage="Failed to load sprints."
    />
  );
}
