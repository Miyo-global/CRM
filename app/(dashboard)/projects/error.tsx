"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ProjectsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load projects"
      fallbackMessage="Something went wrong loading projects. Try again."
    />
  );
}
