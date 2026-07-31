"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function InvoicesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Invoices Error"
      fallbackMessage="Failed to load invoices."
    />
  );
}
