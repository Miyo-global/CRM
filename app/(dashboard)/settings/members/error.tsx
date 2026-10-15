"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function MembersError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load members"
      fallbackMessage="Failed to load members."
    />
  );
}
