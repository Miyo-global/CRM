"use client";

import { RouteErrorBoundary } from "@/components/ui/route-error-boundary";

export default function TimesheetsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorBoundary
      {...props}
      title="Couldn't load timesheets"
      fallbackMessage="Something went wrong loading timesheets. Try again."
    />
  );
}
