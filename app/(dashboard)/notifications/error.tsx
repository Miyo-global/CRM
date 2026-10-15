"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function NotificationsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load notifications"
      fallbackMessage="Something went wrong loading notifications. Try again."
    />
  );
}
