"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function ContentBriefError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Content Brief Generator Error"
      fallbackMessage="Failed to load the content brief generator. Please try again."
    />
  );
}
