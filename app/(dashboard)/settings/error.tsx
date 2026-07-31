"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function SettingsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Settings Error"
      fallbackMessage="Failed to load settings. Please try again."
    />
  );
}
