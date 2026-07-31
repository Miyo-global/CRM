"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ProjectsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Projects Error"
      fallbackMessage="Failed to load projects. Please try again."
    />
  );
}
