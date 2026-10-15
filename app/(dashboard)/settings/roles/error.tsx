"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function RolesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load roles"
      fallbackMessage="Failed to load roles."
    />
  );
}
