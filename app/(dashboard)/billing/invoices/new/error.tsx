"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function NewInvoiceError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="New Invoice Error"
      fallbackMessage="Failed to load the new invoice form."
    />
  );
}
