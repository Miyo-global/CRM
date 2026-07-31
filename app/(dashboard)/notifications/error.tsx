"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function NotificationsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Notifications Error"
      fallbackMessage="Failed to load notifications. Please try again."
    />
  );
}
