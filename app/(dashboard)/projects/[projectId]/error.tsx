"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ProjectError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Project error"
      fallbackMessage="Failed to load project. Please try again or contact support."
    />
  );
}
