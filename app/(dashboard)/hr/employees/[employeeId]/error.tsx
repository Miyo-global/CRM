"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function EmployeeDetailsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Employee Details Error"
      fallbackMessage="Failed to load employee details."
    />
  );
}
