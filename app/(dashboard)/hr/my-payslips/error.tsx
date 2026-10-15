"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function PayslipsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load payslips"
      fallbackMessage="Failed to load payslips."
    />
  );
}
