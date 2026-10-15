"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function EmployeesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load employees"
      fallbackMessage="Something went wrong loading employees data. Try again."
    />
  );
}
