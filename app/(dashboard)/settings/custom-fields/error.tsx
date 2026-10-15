"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function CustomFieldsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load custom fields"
      fallbackMessage="Something went wrong loading custom fields settings. Try again."
    />
  );
}
