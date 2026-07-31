"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function PayslipsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Payslips Error"
      fallbackMessage="Failed to load payslips."
    />
  );
}
