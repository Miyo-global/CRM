"use client";
import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";
export default function WebhooksError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteErrorBoundary {...props} title="Couldn't load webhooks" fallbackMessage="Something went wrong loading webhooks. Try again." />;
}
