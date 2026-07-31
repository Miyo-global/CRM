"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function InboxError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Inbox Error"
      fallbackMessage="Failed to load inbox."
    />
  );
}
