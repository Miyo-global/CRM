"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ProjectSettingsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Project Settings Error"
      fallbackMessage="Failed to load project settings."
    />
  );
}
