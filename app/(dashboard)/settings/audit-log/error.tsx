"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function AuditLogError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Audit Log Error"
      fallbackMessage="Failed to load audit log."
    />
  );
}
