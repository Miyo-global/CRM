"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function BranchesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Branches Error"
      fallbackMessage="Failed to load branches."
    />
  );
}
