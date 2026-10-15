"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function AuditLogError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load audit log"
      fallbackMessage="Failed to load audit log."
    />
  );
}
