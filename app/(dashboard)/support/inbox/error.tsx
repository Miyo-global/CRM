"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function InboxError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load inbox"
      fallbackMessage="Failed to load inbox."
    />
  );
}
