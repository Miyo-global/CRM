"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HrexitError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load exit management"
      fallbackMessage="Something went wrong loading exit management. Try again."
    />
  );
}
