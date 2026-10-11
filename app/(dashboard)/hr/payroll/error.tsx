"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function PayrollError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Failed to load Payroll"
      fallbackMessage="An unexpected error occurred while loading payroll data."
    />
  );
}
