"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function RolesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Roles Error"
      fallbackMessage="Failed to load roles."
    />
  );
}
