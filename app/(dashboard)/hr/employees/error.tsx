"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function EmployeesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Employees Error"
      fallbackMessage="Failed to load employees data. Please try again."
    />
  );
}
