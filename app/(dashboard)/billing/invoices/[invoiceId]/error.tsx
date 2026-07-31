"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function InvoiceDetailError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Invoice Error"
      fallbackMessage="Failed to load invoice details."
    />
  );
}
