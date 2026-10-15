"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function EmployeeDetailsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load employee details"
      fallbackMessage="Failed to load employee details."
    />
  );
}
