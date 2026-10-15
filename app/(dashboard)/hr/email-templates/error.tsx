"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function HremailtemplatesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load email templates"
      fallbackMessage="Something went wrong loading email templates. Try again."
    />
  );
}
