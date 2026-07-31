"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function OrganizationError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Organization Error"
      fallbackMessage="Failed to load organization settings."
    />
  );
}
