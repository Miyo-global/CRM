"use client";
import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";
export default function DataHubError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} title="Data Hub Error" fallbackMessage="Failed to load the data hub. Please try again." />;
}
