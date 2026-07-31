"use client";
import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";
export default function WebhooksError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} title="Webhooks Error" fallbackMessage="Failed to load webhooks. Please try again." />;
}
