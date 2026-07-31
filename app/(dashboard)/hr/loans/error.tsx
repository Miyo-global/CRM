"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrloansError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Loans Error"
      fallbackMessage="Failed to load Loans. Please try again."
    />
  );
}
