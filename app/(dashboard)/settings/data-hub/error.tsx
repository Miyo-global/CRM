"use client";
import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";
export default function DataHubError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} title="Couldn't load data hub" fallbackMessage="Something went wrong loading the data hub. Try again." />;
}
