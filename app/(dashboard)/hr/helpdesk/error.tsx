"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HelpdeskError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load helpdesk"
      fallbackMessage="Failed to load the helpdesk."
    />
  );
}
