"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrfnfError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load full & final"
      fallbackMessage="Something went wrong loading full & final. Try again."
    />
  );
}
